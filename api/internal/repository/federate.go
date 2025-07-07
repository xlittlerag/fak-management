package repository

import (
	"fak-api/internal/models"
	"gorm.io/gorm"
)

type FederateRepository interface {
	FindAll() ([]models.Federate, error)
	FindByID(id uint) (models.Federate, error)
	Create(federate *models.Federate) error
	Update(federate *models.Federate) error
}

type federateRepository struct {
	db *gorm.DB
}

func NewFederateRepository(db *gorm.DB) FederateRepository {
	return &federateRepository{db}
}

func (r *federateRepository) FindAll() ([]models.Federate, error) {
	var federates []models.Federate
	err := r.db.Find(&federates).Error
	return federates, err
}

func (r *federateRepository) FindByID(id uint) (models.Federate, error) {
	var federate models.Federate
	err := r.db.First(&federate, id).Error
	return federate, err
}

func (r *federateRepository) Create(federate *models.Federate) error {
	return r.db.Create(federate).Error
}

func (r *federateRepository) Update(federate *models.Federate) error {
	return r.db.Save(federate).Error
}
