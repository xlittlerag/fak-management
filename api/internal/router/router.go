package router

import (
	"net/http"

	"fak-api/internal/handlers"
	"fak-api/internal/middleware"
	"fak-api/internal/repository"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRouter(db *gorm.DB) *gin.Engine {
	router := gin.Default()

	// --- Repositories ---
	federateRepo := repository.NewFederateRepository(db)
	associationRepo := repository.NewAssociationRepository(db)
	userRepo := repository.NewUserRepository(db)

	// --- Handlers ---
	federateHandler := handlers.NewFederateHandler(federateRepo)
	associationHandler := handlers.NewAssociationHandler(associationRepo)
	authHandler := handlers.NewAuthHandler(userRepo)

	// --- Public Routes ---
	router.POST("/login", authHandler.Login)

	// Serve static files (Svelte compiled output)
	router.Static("/static", "../static")
	router.LoadHTMLGlob("../templates/*") // Load HTML templates

	// Root route to serve the main HTML page
	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{})
	})

	// --- API Group with Authentication ---
	api := router.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// Federate routes
		api.GET("/federates/:id", federateHandler.GetFederate)

		// Route for approved federates to get their own association
		approvedFederateRoutes := api.Group("/")
		approvedFederateRoutes.Use(middleware.RoleAuthMiddleware("approved_federate"))
		{
			approvedFederateRoutes.GET("/associations/my-association", associationHandler.GetMyAssociation)
		}

		// Admin-only routes
		adminRoutes := api.Group("/")
		adminRoutes.Use(middleware.RoleAuthMiddleware("admin"))
		{
			adminRoutes.POST("/associations", associationHandler.CreateAssociation)
			adminRoutes.PUT("/associations/:id", associationHandler.UpdateAssociation)
			adminRoutes.GET("/associations", associationHandler.GetAssociations)

			adminRoutes.GET("/federates", federateHandler.GetFederates)
		}
	}

	return router
}
