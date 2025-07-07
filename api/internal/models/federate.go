package models

import "gorm.io/gorm"

type ActivityRecord struct {
    LastExam    string `json:"lastExam" binding:"required,oneof=3er\\ Kyu 2do\\ Kyu 1er\\ Kyu 1er\\ Dan 2do\\ Dan 3er\\ Dan 4to\\ Dan 5to\\ Dan 6to\\ Dan 7mo\\ Dan 8vo\\ Dan"`
    ExamDate    string `json:"examDate"`
    ExamCity    string `json:"examCity"`
    ExamEmissor string `json:"examEmissor"`
}

type Federate struct {
    gorm.Model
    IDNumber      string `json:"idNumber" binding:"required" gorm:"unique"`
    FirstName     string `json:"firstName" binding:"required"`
    LastName      string `json:"lastName" binding:"required"`
    Birthday      string `json:"birthday" binding:"required,datetime=2006-01-02"`
    Status        string `json:"status" binding:"required,oneof=activo en_deuda inactivo"`
    AssociationID uint   `json:"associationId"`
    Kendo         *ActivityRecord `json:"kendo,omitempty" gorm:"embedded;embeddedPrefix:kendo_"`
    Iaido         *ActivityRecord `json:"iaido,omitempty" gorm:"embedded;embeddedPrefix:iaido_"`
    Jodo          *ActivityRecord `json:"jodo,omitempty" gorm:"embedded;embeddedPrefix:jodo_"`
}
