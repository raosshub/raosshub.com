package com.raosshub.service;

import com.raosshub.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final AppProperties appProperties;

    // ── Local filesystem fallback ──────────────────────────────────────────────
    // Set APP_STORAGE_LOCAL_ENABLED=true on the test site to skip MinIO entirely.
    // Files are stored under localBasePath/{bucket}/{key} and served via the
    // existing /api/files/serve/{bucket}?key= proxy endpoint.
    @Value("${app.storage.local.enabled:false}")
    private boolean localEnabled;

    @Value("${app.storage.local.path:./local-storage}")
    private String localBasePath;

    public String uploadFile(String bucket, String key, InputStream inputStream, long contentLength, String contentType) {
        if (localEnabled) return uploadLocal(bucket, key, inputStream);

        ensureBucketExists(bucket);

        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .contentLength(contentLength)
            .build();

        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
        return key;
    }

    public String uploadBytes(String bucket, String key, byte[] bytes, String contentType) {
        if (localEnabled) {
            try {
                Path target = Paths.get(localBasePath, bucket, key);
                Files.createDirectories(target.getParent());
                Files.write(target, bytes);
                return key;
            } catch (IOException e) {
                throw new RuntimeException("Local storage write failed: " + e.getMessage(), e);
            }
        }

        ensureBucketExists(bucket);

        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .build();

        s3Client.putObject(request, RequestBody.fromBytes(bytes));
        return key;
    }

    public byte[] downloadFile(String bucket, String key) {
        if (localEnabled) {
            try {
                return Files.readAllBytes(Paths.get(localBasePath, bucket, key));
            } catch (IOException e) {
                throw new RuntimeException("Local storage read failed: " + e.getMessage(), e);
            }
        }

        GetObjectRequest request = GetObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();

        return s3Client.getObjectAsBytes(request).asByteArray();
    }

    public void deleteFile(String bucket, String key) {
        if (localEnabled) {
            try { Files.deleteIfExists(Paths.get(localBasePath, bucket, key)); }
            catch (IOException e) { log.warn("Local delete failed {}/{}: {}", bucket, key, e.getMessage()); }
            return;
        }

        try {
            DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();
            s3Client.deleteObject(request);
        } catch (Exception e) {
            log.warn("Failed to delete S3 object {}/{}: {}", bucket, key, e.getMessage());
        }
    }

    /**
     * In local mode returns the backend proxy URL (/api/files/serve/…).
     * In S3 mode generates a real presigned URL for temporary access.
     */
    public String generatePresignedUrl(String bucket, String key, Duration expiration) {
        if (localEnabled) {
            try {
                String encodedKey = URLEncoder.encode(key, StandardCharsets.UTF_8);
                return "/api/files/serve/" + bucket + "?key=" + encodedKey;
            } catch (Exception e) {
                return "/api/files/serve/" + bucket + "?key=" + key;
            }
        }

        try {
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .getObjectRequest(
                    GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build()
                )
                .build();

            return s3Presigner.presignGetObject(presignRequest).url().toString();
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for {}/{}: {}", bucket, key, e.getMessage());
            return appProperties.getS3().getEndpoint() + "/" + bucket + "/" + key;
        }
    }

    /**
     * Returns the content type of an object, or null if not found.
     */
    public String getContentType(String bucket, String key) {
        if (localEnabled) return detectContentType(key);

        try {
            HeadObjectRequest request = HeadObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();
            return s3Client.headObject(request).contentType();
        } catch (Exception e) {
            log.warn("Failed to get content type for {}/{}: {}", bucket, key, e.getMessage());
            return null;
        }
    }

    public String generateKey(String prefix, String originalFilename) {
        String ext = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            ext = originalFilename.substring(dotIndex);
        }
        return prefix + "/" + UUID.randomUUID() + ext;
    }

    private void ensureBucketExists(String bucket) {
        if (localEnabled) {
            try { Files.createDirectories(Paths.get(localBasePath, bucket)); }
            catch (IOException e) { log.warn("Could not create local bucket dir {}: {}", bucket, e.getMessage()); }
            return;
        }

        try {
            HeadBucketRequest headRequest = HeadBucketRequest.builder().bucket(bucket).build();
            s3Client.headBucket(headRequest);
        } catch (NoSuchBucketException e) {
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                log.info("Created S3 bucket: {}", bucket);
            } catch (BucketAlreadyExistsException ex) {
                // Already exists, ignore
            }
        }
    }

    // ── Local filesystem helpers ───────────────────────────────────────────────

    private String uploadLocal(String bucket, String key, InputStream inputStream) {
        try {
            Path target = Paths.get(localBasePath, bucket, key);
            Files.createDirectories(target.getParent());
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            log.debug("[LocalStorage] Saved {}/{}", bucket, key);
            return key;
        } catch (IOException e) {
            throw new RuntimeException("Local storage write failed: " + e.getMessage(), e);
        }
    }

    private String detectContentType(String key) {
        String lower = key.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png"))  return "image/png";
        if (lower.endsWith(".gif"))  return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".svg"))  return "image/svg+xml";
        if (lower.endsWith(".ico"))  return "image/x-icon";
        if (lower.endsWith(".pdf"))  return "application/pdf";
        if (lower.endsWith(".glb"))  return "model/gltf-binary";
        if (lower.endsWith(".gltf")) return "model/gltf+json";
        return "application/octet-stream";
    }

    public String getBucketFiles()   { return appProperties.getS3().getBucketFiles();   }
    public String getBucketGallery() { return appProperties.getS3().getBucketGallery(); }
    public String getBucketPdfs()    { return appProperties.getS3().getBucketPdfs();    }
}