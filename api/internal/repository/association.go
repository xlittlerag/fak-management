package repository

import (
	"gorm.io/gorm"
	"fak-api/internal/models"
)

type AssociationRepository interface {
	Create(association *models.Association) error
	Update(association *models.Association) error
	FindByID(id uint) (models.Association, error)
	FindAll() ([]models.Association, error)
}

type associationRepository struct {
	db *gorm.DB
}

func NewAssociationRepository(db *gorm.DB) AssociationRepository {
	return &associationRepository{db}
}

func (r *associationRepository) Create(association *models.Association) error {
	return r.db.Create(association).Error
}

func (r *associationRepository) Update(association *models.Association) error {
	return r.db.Save(association).Error
}

func (r *associationRepository) FindByID(id uint) (models.Association, error) {
	var association models.Association
	err := r.db.Preload("Federates").First(&association, id).Error
	return association, err
}

func (r *associationRepository) FindAll() ([]models.Association, error) {
	var associations []models.Association
	err := r.db.Find(&associations).Error
	return associations, err
}
