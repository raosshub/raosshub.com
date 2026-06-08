package com.raosshub.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private S3 s3 = new S3();
    private Kimi kimi = new Kimi();
    private Cors cors = new Cors();

    @Data
    public static class Jwt {
        private String secret;
        private long expirationMs = 900000;            // 15 min — access token
        private long refreshExpirationMs = 604800000;  // 7 days — refresh token
        /**
         * Set false for local dev (HTTP localhost).
         * Set true in production via APP_JWT_COOKIE_SECURE=true env var (requires HTTPS).
         */
        private boolean cookieSecure = false;
    }

    @Data
    public static class S3 {
        private String endpoint;
        private String accessKey;
        private String secretKey;
        private String region = "us-east-1";
        private boolean pathStyleAccess = true;
        private String bucketFiles = "raosshub-files";
        private String bucketGallery = "raosshub-gallery";
        private String bucketPdfs = "raosshub-pdfs";
    }

    @Data
    public static class Kimi {
        private String apiKey;
        private String baseUrl = "https://api.moonshot.cn/v1";
    }

    @Data
    public static class Cors {
        private String allowedOrigins = "http://localhost:3000";
    }
}
