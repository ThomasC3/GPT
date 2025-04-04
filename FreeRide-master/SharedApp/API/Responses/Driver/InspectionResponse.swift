//
//  Inspection.swift
//  FreeRide
//

import Foundation
import UIKit

struct InspectionResponse: Codable {

    let inspectionForm: InspectionForm
    
    init(inspectionForm: InspectionForm) {
        self.inspectionForm = inspectionForm
    }
}

struct InspectionForm: Codable {
    
    let id: String
    let inspectionType: String
    let name: String
    let questions: [InspectionQuestion]
        
    init(id: String, inspectionType: String, name: String, questions: [InspectionQuestion]) {
        self.id = id
        self.inspectionType = inspectionType
        self.name = name
        self.questions = questions
    }
    
    func isCheckOut() -> Bool {
        return self.inspectionType == "check-out"
    }
}

struct InspectionQuestion: Codable {
    
    let id: String
    let responseType: String
    let questionString: String
    let questionKey: String
    let optional: Bool
    
    init(id: String, responseType: String, questionString: String, questionKey: String, optional: Bool) {
        self.id = id
        self.responseType = responseType
        self.questionString = questionString
        self.questionKey = questionKey
        self.optional = optional
    }
    
    func getImage() -> UIImage {
        switch self.questionKey {
        case "battery":
            return #imageLiteral(resourceName: "round_electric_rickshaw_black_24pt")
        case "mileage":
            return #imageLiteral(resourceName: "round_add_road_black_24pt")
        case "damage":
            return #imageLiteral(resourceName: "round_handyman_black_24pt")
        case "notes":
            return #imageLiteral(resourceName: "round_fact_check_black_24pt")
        default:
            return #imageLiteral(resourceName: "round_fact_check_black_24pt")
        }
    }
}

