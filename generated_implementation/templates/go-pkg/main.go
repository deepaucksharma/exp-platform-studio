package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello from DStudio Go Implementation!")
	})
	
	log.Println("Server starting on port 8080")
	r.Run(":8080")
}
