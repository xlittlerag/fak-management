package database

import (
    "log"
    "os"
    "time"

    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
    "fak-api/internal/models"
)

func InitDatabase() *gorm.DB {
    newLogger := logger.New(
        log.New(os.Stdout, "\r\n", log.LstdFlags),
        logger.Config{
            SlowThreshold: time.Second,
            LogLevel:      logger.Info,
            Colorful:      true,
        },
    )

    db, err := gorm.Open(sqlite.Open("federates.db"), &gorm.Config{
        Logger: newLogger,
    })
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    err = db.AutoMigrate(&models.Federate{}, &models.Association{}, &models.User{})
    if err != nil {
        log.Fatalf("Failed to auto-migrate database: %v", err)
    }

    Seed(db) // Seed initial data

    return db
}
