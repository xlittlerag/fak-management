package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"fak-api/internal/repository"
)

type FederateHandler struct {
	repo repository.FederateRepository
}

func NewFederateHandler(repo repository.FederateRepository) *FederateHandler {
	return &FederateHandler{repo}
}

func (h *FederateHandler) GetFederate(c *gin.Context) {
	// --- Get user info from context (set by AuthMiddleware) ---
	userRole, _ := c.Get("role")
	userFederateID, _ := c.Get("federateID")
	userAssociationID, _ := c.Get("associationID")

	// --- Get target federate from DB ---
	idStr := c.Param("id")
	targetFederateID, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid federate ID"})
		return
	}
	
	targetFederate, err := h.repo.FindByID(uint(targetFederateID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Federate not found"})
		return
	}

	// --- Authorization Logic ---
	switch userRole {
	case "admin":
		// Admins can see anyone.
		c.JSON(http.StatusOK, targetFederate)
		return
	case "approved_federate":
		// Approved federates can see others in the same association.
		if targetFederate.AssociationID == userAssociationID.(uint) {
			c.JSON(http.StatusOK, targetFederate)
			return
		}
	case "federate":
		// Federates can only see their own profile.
		if uint(targetFederateID) == userFederateID.(uint) {
			c.JSON(http.StatusOK, targetFederate)
			return
		}
	}

	// If none of the conditions are met, deny access.
	c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to view this federate's status"})
}

func (h *FederateHandler) GetFederates(c *gin.Context) {
    federates, err := h.repo.FindAll()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve federates"})
        return
    }
    c.JSON(http.StatusOK, federates)
}
