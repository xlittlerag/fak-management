package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ActivityRecord represents the details for a specific martial arts activity.
type ActivityRecord struct {
	LastExam    string `json:"lastExam" binding:"required,oneof=3er\\ Kyu 2do\\ Kyu 1er\\ Kyu 1er\\ Dan 2do\\ Dan 3er\\ Dan 4to\\ Dan 5to\\ Dan 6to\\ Dan 7mo\\ Dan 8vo\\ Dan"` // Validated exam levels
	ExamDate    string `json:"examDate"`    // YYYY-MM-DD format
	ExamCity    string `json:"examCity"`
	ExamEmissor string `json:"examEmissor"`
}

// Associate represents an associate in the database with their details and activity records.
type Associate struct {
	gorm.Model

	IDNumber  string `json:"idNumber" binding:"required" gorm:"unique"` // Unique identification number
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
	Birthday  string `json:"birthday" binding:"required,datetime=2006-01-02"`
	Status    string `json:"status" binding:"required,oneof=activo en_deuda inactivo"`

	Kendo *ActivityRecord `json:"kendo,omitempty" gorm:"embedded;embeddedPrefix:kendo_"`
	Iaido *ActivityRecord `json:"iaido,omitempty" gorm:"embedded;embeddedPrefix:iaido_"`
	Jodo  *ActivityRecord `json:"jodo,omitempty" gorm:"embedded;embeddedPrefix:jodo_"`
}

// DB global variable for database connection
var DB *gorm.DB

// initDatabase initializes the SQLite database and performs auto-migration
func initDatabase() {
	var err error
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold: time.Second,
			LogLevel:      logger.Info,
			Colorful:      true,
		},
	)

	DB, err = gorm.Open(sqlite.Open("associates.db"), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	err = DB.AutoMigrate(&Associate{})
	if err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}

	log.Println("Database migration complete!")

	// Seed some initial data if the table is empty
	var count int64
	DB.Model(&Associate{}).Count(&count)
	if count == 0 {
		log.Println("Seeding initial associate data...")
		associates := []Associate{
			{
				IDNumber:  "AR001",
				FirstName: "Martín",
				LastName:  "García",
				Birthday:  "1990-05-15",
				Status:    "activo",
				Kendo: &ActivityRecord{
					LastExam:    "3er Dan",
					ExamDate:    "2023-11-20",
					ExamCity:    "Buenos Aires",
					ExamEmissor: "FAK",
				},
				Iaido: nil,
				Jodo:  nil,
			},
			{
				IDNumber:  "AR002",
				FirstName: "Sofía",
				LastName:  "Fernández",
				Birthday:  "1985-01-22",
				Status:    "en_deuda",
				Kendo: nil,
				Iaido: &ActivityRecord{
					LastExam:    "2do Dan",
					ExamDate:    "2022-08-10",
					ExamCity:    "Santiago de Chile",
					ExamEmissor: "CLAK",
				},
				Jodo: nil,
			},
			{
				IDNumber:  "AR003",
				FirstName: "Diego",
				LastName:  "Pérez",
				Birthday:  "1992-09-01",
				Status:    "inactivo",
				Kendo: nil,
				Iaido: nil,
				Jodo: &ActivityRecord{
					LastExam:    "1er Kyu",
					ExamDate:    "2024-03-05",
					ExamCity:    "Rosario",
					ExamEmissor: "FAK",
				},
			},
			{
				IDNumber:  "AR004",
				FirstName: "Valentina",
				LastName:  "Lopez",
				Birthday:  "1975-12-01",
				Status:    "activo",
				Kendo: &ActivityRecord{
					LastExam:    "4to Dan",
					ExamDate:    "2024-01-10",
					ExamCity:    "Mar del Plata",
					ExamEmissor: "FAK",
				},
				Iaido: &ActivityRecord{
					LastExam:    "3er Dan",
					ExamDate:    "2023-07-25",
					ExamCity:    "Montevideo",
					ExamEmissor: "CLAK",
				},
				Jodo: nil,
			},
			{
				IDNumber:  "AR005",
				FirstName: "Juan",
				LastName:  "Silva",
				Birthday:  "1995-03-10",
				Status:    "activo",
				Kendo: &ActivityRecord{
					LastExam:    "1er Kyu",
					ExamDate:    "2024-06-01",
					ExamCity:    "Córdoba",
					ExamEmissor: "FAK",
				},
				Iaido: nil,
				Jodo: nil,
			},
			{
				IDNumber:  "AR006",
				FirstName: "Pedro",
				LastName:  "Ramírez",
				Birthday:  "1988-11-25",
				Status:    "activo",
				Kendo: nil,
				Iaido: nil,
				Jodo: &ActivityRecord{
					LastExam:    "2do Kyu",
					ExamDate:    "2023-09-15",
					ExamCity:    "Lima",
					ExamEmissor: "CLAK",
				},
			},
		}
		DB.Create(&associates)
		log.Println("Initial associate data seeded.")
	}
}

// getAssociates retrieves a list of all associates
func getAssociates(c *gin.Context) {
	var associates []Associate
	if result := DB.Find(&associates); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve associates"})
		return
	}
	c.JSON(http.StatusOK, associates)
}

// getAssociate retrieves a single associate by their ID
func getAssociate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid associate ID"})
		return
	}

	var associate Associate
	if result := DB.First(&associate, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Associate not found"})
		return
	}
	c.JSON(http.StatusOK, associate)
}

// createAssociate creates a new associate with the provided details
func createAssociate(c *gin.Context) {
	var associate Associate
	if err := c.ShouldBindJSON(&associate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Important: If activity records are passed as empty objects from frontend,
	// convert them to nil pointers if all their fields are empty to store as NULL in DB.
	if associate.Kendo != nil && associate.Kendo.LastExam == "" && associate.Kendo.ExamDate == "" && associate.Kendo.ExamCity == "" && associate.Kendo.ExamEmissor == "" {
		associate.Kendo = nil
	}
	if associate.Iaido != nil && associate.Iaido.LastExam == "" && associate.Iaido.ExamDate == "" && associate.Iaido.ExamCity == "" && associate.Iaido.ExamEmissor == "" {
		associate.Iaido = nil
	}
	if associate.Jodo != nil && associate.Jodo.LastExam == "" && associate.Jodo.ExamDate == "" && associate.Jodo.ExamCity == "" && associate.Jodo.ExamEmissor == "" {
		associate.Jodo = nil
	}

	if result := DB.Create(&associate); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create associate. Check if ID Number is unique."})
		return
	}
	c.JSON(http.StatusCreated, associate)
}

// updateAssociate updates an existing associate by their ID
func updateAssociate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid associate ID"})
		return
	}

	var associate Associate
	if result := DB.First(&associate, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Associate not found"})
		return
	}

	var updatedAssociate Associate
	if err := c.ShouldBindJSON(&updatedAssociate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields from the request body
	associate.IDNumber = updatedAssociate.IDNumber // Allow updating ID Number
	associate.FirstName = updatedAssociate.FirstName
	associate.LastName = updatedAssociate.LastName
	associate.Birthday = updatedAssociate.Birthday
	associate.Status = updatedAssociate.Status

	// Handle optional embedded structs: if the incoming struct is empty, set the pointer to nil
	if updatedAssociate.Kendo != nil && updatedAssociate.Kendo.LastExam == "" && updatedAssociate.Kendo.ExamDate == "" && updatedAssociate.Kendo.ExamCity == "" && updatedAssociate.Kendo.ExamEmissor == "" {
		associate.Kendo = nil
	} else {
		associate.Kendo = updatedAssociate.Kendo
	}

	if updatedAssociate.Iaido != nil && updatedAssociate.Iaido.LastExam == "" && updatedAssociate.Iaido.ExamDate == "" && updatedAssociate.Iaido.ExamCity == "" && updatedAssociate.Iaido.ExamEmissor == "" {
		associate.Iaido = nil
	} else {
		associate.Iaido = updatedAssociate.Iaido
	}

	if updatedAssociate.Jodo != nil && updatedAssociate.Jodo.LastExam == "" && updatedAssociate.Jodo.ExamDate == "" && updatedAssociate.Jodo.ExamCity == "" && updatedAssociate.Jodo.ExamEmissor == "" {
		associate.Jodo = nil
	} else {
		associate.Jodo = updatedAssociate.Jodo
	}

	if result := DB.Save(&associate); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update associate. Check if ID Number is unique."})
		return
	}
	c.JSON(http.StatusOK, associate)
}

// deleteAssociate deletes an associate by their ID
func deleteAssociate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid associate ID"})
		return
	}

	var associate Associate
	if result := DB.First(&associate, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Associate not found"})
		return
	}
	if result := DB.Delete(&associate); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete associate"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Associate deleted successfully"})
}

// main function to run the Gin server
func main() {
	initDatabase() // Initialize database connection

	router := gin.Default()

	// Serve static files (Svelte compiled output)
	router.Static("/static", "./static")
	router.LoadHTMLGlob("templates/*") // Load HTML templates

	// Root route to serve the main HTML page
	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{})
	})

	// API group for associates
	api := router.Group("/api")
	{
		api.GET("/associates", getAssociates)
		api.GET("/associates/:id", getAssociate)
		api.POST("/associates", createAssociate)
		api.PUT("/associates/:id", updateAssociate)
		api.DELETE("/associates/:id", deleteAssociate)
	}

	log.Println("Server starting on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

