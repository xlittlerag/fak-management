package models

import "gorm.io/gorm"

type User struct {
    gorm.Model
    Username      string `json:"username" gorm:"unique"`
    Password      string `json:"-"`
    Role          string `json:"role" binding:"oneof=federate approved_federate admin"`
    FederateID    uint   `json:"federateId,omitempty"`
    AssociationID uint   `json:"associationId,omitempty"`
}
