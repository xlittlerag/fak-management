package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

// TODO: Use a secure, environment-variable-loaded key in production
var jwtKey = []byte("your_very_secret_key")

type Claims struct {
	UserID        uint   `json:"userID"`
	Username      string `json:"username"`
	Role          string `json:"role"`
	FederateID    uint   `json:"federateId"`
	AssociationID uint   `json:"associationId"`
	jwt.StandardClaims
}

// GenerateToken creates a new JWT for a user
func GenerateToken(userID uint, username, role string, federateID, associationID uint) (string, error) {
	expirationTime := time.Now().Add(2 * time.Hour)
	claims := &Claims{
		UserID:        userID,
		Username:      username,
		Role:          role,
		FederateID:    federateID,
		AssociationID: associationID,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}


// AuthMiddleware validates the token and sets user context.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set user details in the context for the handler to use
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Set("federateID", claims.FederateID)
		c.Set("associationID", claims.AssociationID)

		c.Next()
	}
}

// RoleAuthMiddleware checks for a minimum required role.
func RoleAuthMiddleware(requiredRole string) gin.HandlerFunc {
    return func(c *gin.Context) {
        role, exists := c.Get("role")
        if !exists {
            c.JSON(http.StatusForbidden, gin.H{"error": "Role not found in token"})
            c.Abort()
            return
        }

        userRole := role.(string)
        // Admin can do anything
        if userRole == "admin" {
            c.Next()
            return
        }
		
        if userRole != requiredRole {
            c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Forbidden: requires '%s' role", requiredRole)})
            c.Abort()
            return
        }

        c.Next()
    }
}
