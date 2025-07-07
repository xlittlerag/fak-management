package database

import (
    "log"

    "golang.org/x/crypto/bcrypt"
    "gorm.io/gorm"
    "fak-api/internal/models"
)

func Seed(db *gorm.DB) {
    var count int64
    db.Model(&models.Association{}).Count(&count)
    if count > 0 {
        return // Data already seeded
    }

    log.Println("Seeding initial data...")

    // Seed Associations
    associations := []models.Association{
        {Name: "Shisenkai"},
        {Name: "Katsumoto"},
    }
    db.Create(&associations)

    // Seed Federates
    federates := []models.Federate{
        {
            IDNumber:      "AR001",
            FirstName:     "Martín",
            LastName:      "García",
            Birthday:      "1990-05-15",
            Status:        "activo",
            AssociationID: 1,
            Kendo:         &models.ActivityRecord{LastExam: "3er Dan", ExamDate: "2023-11-20", ExamCity: "Buenos Aires", ExamEmissor: "FAK"},
        },
        {
            IDNumber:      "AR002",
            FirstName:     "Camila",
            LastName:      "Sosa",
            Birthday:      "1982-11-03",
            Status:        "inactivo",
            AssociationID: 2,
            Kendo:         &models.ActivityRecord{LastExam: "4to Dan", ExamDate: "2025-02-04", ExamCity: "Montevideo", ExamEmissor: "CLAK"},
        },
    }
    db.Create(&federates)

    // Seed Users
    hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
    users := []models.User{
        {Username: "admin", Password: string(hashedPassword), Role: "admin"},
        {Username: "federate1", Password: string(hashedPassword), Role: "federate", FederateID: 1},
        {Username: "approved_federate1", Password: string(hashedPassword), Role: "approved_federate", AssociationID: 1},
    }
    db.Create(&users)

    log.Println("Initial data seeded.")
}
