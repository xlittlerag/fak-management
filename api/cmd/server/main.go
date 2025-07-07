package main

import (
    "log"

    "fak-api/internal/database"
    "fak-api/internal/router"
)

func main() {
    db := database.InitDatabase()
    r := router.SetupRouter(db)

    log.Println("Server starting on :8080")
    if err := r.Run(":8080"); err != nil {
        log.Fatalf("Server failed to start: %v", err)
    }
}
