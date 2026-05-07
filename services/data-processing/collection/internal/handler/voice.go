package handler

import (
	"io"
	"net/http"

	"finapp/services/data-processing/collection/internal/service"

	"github.com/gin-gonic/gin"
)

type VoiceHandler struct {
	svc *service.VoiceService
}

func NewVoiceHandler(svc *service.VoiceService) *VoiceHandler {
	return &VoiceHandler{svc: svc}
}

// Upload принимает аудиофайл, отправляет в ML, сохраняет транскрипцию.
// POST /voice/upload
// multipart: file (audio), optional: audio_url
func (h *VoiceHandler) Upload(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user id required"})
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required: " + err.Error()})
		return
	}
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/webm"
	}
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "open file: " + err.Error()})
		return
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "read file: " + err.Error()})
		return
	}
	var audioURL *string
	if u := c.PostForm("audio_url"); u != "" {
		audioURL = &u
	}
	vt, err := h.svc.UploadFromBytes(c.Request.Context(), userID, data, contentType, audioURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, vt)
}
