//
//  NSManagedObjectContext+Queries.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import CoreData

extension NSManagedObjectContext {

    func wipeLocation() {
        let entities = [Location.self].map { String(describing: $0) }
        wipe(entities: entities)
    }

    func wipeLocationDetails() {
        let entities = [Coordinate.self, ServiceHours.self].map { String(describing: $0) }
        wipe(entities: entities)
    }

    func wipeRides() {
        let entities = [Ride.self].map { String(describing: $0) }
        wipe(entities: entities)
    }

    private func wipe(entities: [String]) {
        guard !entities.isEmpty else {
            return
        }

        entities.forEach {
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName: $0)
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)

            do {
                try execute(deleteRequest)
            } catch {
                print(error.localizedDescription)
            }
        }

        saveContext()
    }
}
