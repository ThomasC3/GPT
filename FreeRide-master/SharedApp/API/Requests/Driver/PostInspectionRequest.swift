//
//  c.swift
//  FreeRide
//

import Foundation

struct PostCheckInInspectionRequest: Codable {
    
    let inspectionForm: InspectionSubmission
}

struct PostCheckOutInspectionRequest: Codable {
    
    let service: String
    let inspectionForm: InspectionSubmission
}

struct InspectionSubmission: Codable {

    let id: String
    let responses: [InspectionAnswer]
}

struct InspectionAnswer: Codable {

    let questionId: String
    let response: String
}
