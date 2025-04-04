//
//  VehicleResponse.swift
//  FreeRide
//

import Foundation
import UIKit

struct VehicleResponse: Codable {
    
    let id: String
    let name: String
    let publicId: String
    let adaCapacity: Int?
    let passengerCapacity: Int?
    let type: String?
    let services: [ServiceResponse]?
    let serviceKey: String?
    let serviceTitle: String?
    let licensePlate: String?

    let battery: Int?
    let mileage: Int?
    let pluggedIn: Bool?

    let matchingRule: MatchingRuleResponse?
    let zones: [ZoneResponse]?
    
    func getDescription() -> String {
        return "\(self.type ?? "No type"), \(self.passengerCapacity ?? 0) passengers, \(self.adaCapacity ?? 0) ADA passengers"
    }
    
    func getLastReadings() -> String {
        if self.battery == nil && self.mileage == nil && self.pluggedIn == nil {
            return "No readings for this vehicle"
        }
        
        var lastReading: [String] = []
        
        if let battery = self.battery {
            lastReading.append("\(battery)% charged")
        }
        
        if let mileage = self.mileage {
            lastReading.append("\(mileage) miles")
        }
        
        if let pluggedIn = self.pluggedIn {
            lastReading.append("\(pluggedIn ? "plugged in" : "not plugged in")")
        }
        
        return lastReading.joined(separator:", ")
    }
    
    func getImage() -> UIImage {
        return #imageLiteral(resourceName: "round_airport_shuttle_black_20pt")
//        switch self.type {
//        case 1:
//            return #imageLiteral(resourceName: "round_airport_shuttle_black_20pt")
//        case 2:
//            return #imageLiteral(resourceName: "round_local_shipping_black_20pt")
//        case 3:
//            return #imageLiteral(resourceName: "round_directions_car_filled_black_20pt")
//        default:
//            return #imageLiteral(resourceName: "round_airport_shuttle_black_20pt")
//        }
    }
    
}

struct ServiceResponse: Codable {

    let id: String
    let title: String
    let desc: String
    let key: String
        
    init(id: String, title: String, desc: String, key: String) {
        self.id = id
        self.title = title
        self.desc = desc
        self.key = key
    }
    
    func getImages() -> [UIImage] {
        switch self.key {
        case "passenger_only":
            return [#imageLiteral(resourceName: "round_emoji_people_black_36pt")]
        case "ada_only":
            return [#imageLiteral(resourceName: "round_accessible_black_36pt")]
        case "mixed_service":
            return [#imageLiteral(resourceName: "round_emoji_people_black_36pt"), #imageLiteral(resourceName: "round_add_black_36pt"), #imageLiteral(resourceName: "round_accessible_black_36pt")]
        case "delivery":
            return [#imageLiteral(resourceName: "round_shopping_bag_black_36pt")]
        default:
            return [#imageLiteral(resourceName: "round_emoji_people_black_36pt")]
        }
    }
}
