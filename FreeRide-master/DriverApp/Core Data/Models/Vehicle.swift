//
//  Vehicle.swift
//  FreeRide
//

import CoreData
import UIKit

class Vehicle: NSManagedObject {

    @NSManaged var id: String
    @NSManaged var publicId: String
    @NSManaged var name: String
    @NSManaged var service: String?
    @NSManaged var adaCapacity: Int32
    @NSManaged var passengerCapacity: Int32
    @NSManaged var type: String
    @NSManaged var licensePlate: String?

    @NSManaged var matchingRule: MatchingRule?
    @NSManaged var zones: Set<Zone>?
    
    func update(with response: VehicleResponse) {
        self.id = response.id
        self.publicId = response.publicId
        self.name = response.name
        self.service = response.serviceTitle
        self.adaCapacity = Int32(response.adaCapacity ?? 0)
        self.passengerCapacity = Int32(response.passengerCapacity ?? 0)
        self.type = response.type ?? ""
        self.licensePlate = response.licensePlate

        guard let ctx = managedObjectContext else {
            managedObjectContext?.saveContext()
            return
        }

        if let matchingRule = response.matchingRule {
            let rule = MatchingRule(context: ctx)
            rule.key = matchingRule.key
            rule.title = matchingRule.title
            self.matchingRule = rule
        }

        if let zones = response.zones {
            self.zones = Set(zones.map {
                let zone = Zone(context: ctx)
                zone.id = $0.id
                zone.name = $0.name
                return zone
            })
        }

        ctx.saveContext()
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
