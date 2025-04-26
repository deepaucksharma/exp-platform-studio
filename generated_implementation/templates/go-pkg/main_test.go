package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello from DStudio Go Implementation!")
	})
	return r
}

func TestHelloEndpoint(t *testing.T) {
	// Switch to test mode
	gin.SetMode(gin.TestMode)

	// Setup router
	r := setupRouter()

	// Create a test request
	req, _ := http.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Assert status code
	assert.Equal(t, http.StatusOK, w.Code)
	// Assert response body
	assert.Contains(t, w.Body.String(), "Hello from DStudio Go Implementation!")
}
