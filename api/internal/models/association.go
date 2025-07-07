package models

import "gorm.io/gorm"

type Association struct {
    gorm.Model
    Name      string     `json:"name" binding:"required" gorm:"unique"`
    Federates []Federate `json:"federates,omitempty"`
}
