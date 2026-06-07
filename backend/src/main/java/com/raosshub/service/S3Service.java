package com.raosshub.service;

import com.raosshub.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;
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

    public String generatePresignedUrl(String bucket, String key, Duration expiration) {
        return appProperties.getS3().getEndpoint() + "/" + bucket + "/" + key;
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
