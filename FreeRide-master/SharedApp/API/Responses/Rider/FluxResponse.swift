//
//  FluxResponse.swift
//  FreeRide
//

import Foundation
import UIKit

struct FluxResponse: Codable {
    
    let status: Int
    let message: String
    let color: String
    let display: Bool
    
    init(status: Int, message: String, color: String, display: Bool) {
        self.status = status
        self.message = message
        self.color = color
        self.display = display
    }
    
    func getBackgroundColor() -> UIColor {
        if color == "red" {
            return Theme.Colors.fluxRed
        } else if color == "yellow" {
            return Theme.Colors.fluxYellow
        } else {
            return Theme.Colors.fluxGreen
        }
    }
        
    func getTextColor() -> UIColor {
        if color == "red" {
            return UIColor.white
        } else {
            return UIColor.black
        }
    }
}
