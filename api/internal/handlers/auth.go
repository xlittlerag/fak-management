package handlers

import (
	"net/http"

	"fak-api/internal/middleware"
	"fak-api/internal/repository"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthHandler struct {
	userRepo repository.UserRepository
}

func NewAuthHandler(userRepo repository.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

// Login handles the user login process, validates credentials, and returns a JWT.
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest

	// Bind the incoming JSON request to the LoginRequest struct.
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Find the user by username using the repository.
	user, err := h.userRepo.FindByUsername(req.Username)
	if err != nil {
		// Do not specify whether the username or password was wrong for security.
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Compare the provided password with the stored hash.
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		// Password does not match.
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// If credentials are valid, generate a JWT.
	// We pass all the necessary details to be included in the token's claims.
	token, err := middleware.GenerateToken(user.ID, user.Role, user.FederateID, user.AssociationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	// Return the token in the response.
	c.JSON(http.StatusOK, gin.H{"token": token})
}
