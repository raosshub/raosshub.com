package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.entity.*;
import com.raosshub.repository.*;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.AuditLogService;
import com.raosshub.service.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class FileController {

    private final S3Service s3Service;
    private final TeamFileRepository teamFileRepository;
    private final GalleryImageRepository galleryImageRepository;
    private final PdfDocumentRepository pdfDocumentRepository;
    private final PdfVersionRepository pdfVersionRepository;
    private final AuditLogService auditLogService;

    // ─── Team Files ────────────────────────────────────────────────
    @GetMapping("/{teamId}/files")
    public ResponseEntity<ApiResponse<List<TeamFile>>> getTeamFiles(@PathVariable String teamId) {
        return ResponseEntity.ok(ApiResponse.ok(teamFileRepository.findByTeamIdOrderByCreatedAtDesc(teamId)));
    }

    @PostMapping(value = "/{teamId}/files/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<TeamFile>> uploadTeamFile(
            @PathVariable String teamId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetailsImpl user) throws Exception {

        String key = s3Service.generateKey("files/" + teamId, file.getOriginalFilename());
        s3Service.uploadFile(s3Service.getBucketFiles(), key,
            file.getInputStream(), file.getSize(), file.getContentType());

        TeamFile tf = new TeamFile();
        tf.setTeamId(teamId);
        tf.setFileName(file.getOriginalFilename());
        tf.setS3Key(key);
        tf.setS3Bucket(s3Service.getBucketFiles());
        tf.setS3Url(s3Service.generatePresignedUrl(s3Service.getBucketFiles(), key, java.time.Duration.ofDays(7)));
        tf.setFileSize(file.getSize());
        tf.setMimeType(file.getContentType());
        tf.setUploadedBy(user.getUsername());

        TeamFile saved = teamFileRepository.save(tf);
        auditLogService.log(user.getUsername(), "upload", "files", saved.getId(),
            file.getOriginalFilename(), null);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<ApiResponse<Void>> deleteTeamFile(
            @PathVariable Long fileId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        TeamFile tf = teamFileRepository.findById(fileId)
            .orElseThrow(() -> new RuntimeException("File not found"));
        s3Service.deleteFile(tf.getS3Bucket(), tf.getS3Key());
        teamFileRepository.delete(tf);
        auditLogService.log(user.getUsername(), "delete", "files", fileId,
            tf.getFileName(), null);
        return ResponseEntity.ok(ApiResponse.ok(null, "File deleted"));
    }

    // ─── Gallery ───────────────────────────────────────────────────
    @GetMapping("/{teamId}/gallery")
    public ResponseEntity<ApiResponse<List<GalleryImage>>> getGallery(@PathVariable String teamId) {
        return ResponseEntity.ok(ApiResponse.ok(galleryImageRepository.findByTeamIdOrderByCreatedAtDesc(teamId)));
    }

    @PostMapping(value = "/{teamId}/gallery/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<GalleryImage>> uploadGalleryImage(
            @PathVariable String teamId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetailsImpl user) throws Exception {

        String key = s3Service.generateKey("gallery/" + teamId, file.getOriginalFilename());
        s3Service.uploadFile(s3Service.getBucketGallery(), key,
            file.getInputStream(), file.getSize(), file.getContentType());

        GalleryImage img = new GalleryImage();
        img.setTeamId(teamId);
        img.setFileName(file.getOriginalFilename());
        img.setS3Key(key);
        img.setS3Bucket(s3Service.getBucketGallery());
        img.setS3Url(s3Service.generatePresignedUrl(s3Service.getBucketGallery(), key, java.time.Duration.ofDays(7)));
        img.setFileSize(file.getSize());
        img.setMimeType(file.getContentType());
        img.setCreatedBy(user.getUsername());

        GalleryImage saved = galleryImageRepository.save(img);
        auditLogService.log(user.getUsername(), "upload", "gallery", saved.getId(),
            file.getOriginalFilename(), null);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @DeleteMapping("/gallery/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteGalleryImage(
            @PathVariable Long imageId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        GalleryImage img = galleryImageRepository.findById(imageId)
            .orElseThrow(() -> new RuntimeException("Image not found"));
        s3Service.deleteFile(img.getS3Bucket(), img.getS3Key());
        galleryImageRepository.delete(img);
        auditLogService.log(user.getUsername(), "delete", "gallery", imageId,
            img.getFileName(), null);
        return ResponseEntity.ok(ApiResponse.ok(null, "Image deleted"));
    }

    // ─── PDF Documents ─────────────────────────────────────────────
    @GetMapping("/{teamId}/pdf")
    public ResponseEntity<ApiResponse<List<PdfDocument>>> getPdfDocuments(@PathVariable String teamId) {
        return ResponseEntity.ok(ApiResponse.ok(pdfDocumentRepository.findByTeamIdAndIsActiveTrueOrderByCreatedAtDesc(teamId)));
    }

    @PostMapping(value = "/{teamId}/pdf/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PdfDocument>> uploadPdf(
            @PathVariable String teamId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @AuthenticationPrincipal UserDetailsImpl user) throws Exception {

        String key = s3Service.generateKey("pdfs/" + teamId, file.getOriginalFilename());
        s3Service.uploadFile(s3Service.getBucketPdfs(), key,
            file.getInputStream(), file.getSize(), file.getContentType());

        PdfDocument doc = new PdfDocument();
        doc.setTeamId(teamId);
        doc.setTitle(title);
        doc.setFileName(file.getOriginalFilename());
        doc.setFileSize(file.getSize());
        doc.setMimeType(file.getContentType());
        doc.setS3Key(key);
        doc.setS3Bucket(s3Service.getBucketPdfs());
        doc.setCreatedBy(user.getUsername());

        PdfDocument saved = pdfDocumentRepository.save(doc);
        auditLogService.log(user.getUsername(), "upload", "pdf", saved.getId(),
            title, null);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @DeleteMapping("/pdf/{docId}")
    public ResponseEntity<ApiResponse<Void>> deletePdfDocument(
            @PathVariable Long docId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        PdfDocument doc = pdfDocumentRepository.findById(docId)
            .orElseThrow(() -> new RuntimeException("PDF not found"));
        doc.setIsActive(false);
        pdfDocumentRepository.save(doc);
        auditLogService.log(user.getUsername(), "delete", "pdf", docId,
            doc.getTitle(), null);
        return ResponseEntity.ok(ApiResponse.ok(null, "PDF removed"));
    }

    // ─── Chat Summaries ────────────────────────────────────────────
    @GetMapping("/{teamId}/summaries")
    public ResponseEntity<ApiResponse<?>> getSummaries(@PathVariable String teamId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("teamId", teamId, "message", "Use chat summary endpoints")));
    }
}
