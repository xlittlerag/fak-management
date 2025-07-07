package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"fak-api/internal/models"
	"fak-api/internal/repository"
)

type AssociationHandler struct {
	repo repository.AssociationRepository
}

func NewAssociationHandler(repo repository.AssociationRepository) *AssociationHandler {
	return &AssociationHandler{repo}
}

// GetMyAssociation allows an approved federate to get their own association's details.
func (h *AssociationHandler) GetMyAssociation(c *gin.Context) {
	userAssociationID, exists := c.Get("associationID")
	if !exists || userAssociationID.(uint) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "No association linked to your account"})
		return
	}

	association, err := h.repo.FindByID(userAssociationID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Association not found"})
		return
	}

	c.JSON(http.StatusOK, association)
}

// GetAssociations allows an admin to get a list of all associations.
func (h *AssociationHandler) GetAssociations(c *gin.Context) {
	associations, err := h.repo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve associations"})
		return
	}

	c.JSON(http.StatusOK, associations)
}

func (h *AssociationHandler) CreateAssociation(c *gin.Context) {
	var newAssociation models.Association
	if err := c.ShouldBindJSON(&newAssociation); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.Create(&newAssociation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create association"})
		return
	}
	c.JSON(http.StatusCreated, newAssociation)
}

func (h *AssociationHandler) UpdateAssociation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid association ID"})
		return
	}

	var updatedInfo models.Association
	if err := c.ShouldBindJSON(&updatedInfo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch existing association to update
	association, err := h.repo.FindByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Association not found"})
		return
	}
	
	// Update fields
	association.Name = updatedInfo.Name

	if err := h.repo.Update(&association); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update association"})
		return
	}

	c.JSON(http.StatusOK, association)
}
