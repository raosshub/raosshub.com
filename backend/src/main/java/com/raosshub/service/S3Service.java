package com.raosshub.service;

import com.raosshub.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final AppProperties appProperties;

    public String uploadFile(String bucket, String key, InputStream inputStream, long contentLength, String contentType) {
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
        GetObjectRequest request = GetObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();

        return s3Client.getObjectAsBytes(request).asByteArray();
    }

    public void deleteFile(String bucket, String key) {
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
     * Generates a real presigned URL for temporary access to a private S3 object.
     */
    public String generatePresignedUrl(String bucket, String key, Duration expiration) {
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
            // Fallback: return direct URL (may not work without public bucket)
            return appProperties.getS3().getEndpoint() + "/" + bucket + "/" + key;
        }
    }

    /**
     * Returns the content type of an object, or null if not found.
     */
    public String getContentType(String bucket, String key) {
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

    public String getBucketFiles() { return appProperties.getS3().getBucketFiles(); }
    public String getBucketGallery() { return appProperties.getS3().getBucketGallery(); }
    public String getBucketPdfs() { return appProperties.getS3().getBucketPdfs(); }
}
