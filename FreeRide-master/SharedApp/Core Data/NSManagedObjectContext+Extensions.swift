//
//  NSManagedObjectContext+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 7/1/18.
//  Copyright © 2018 Rocket n Mouse. All rights reserved.
//

import CoreData

extension NSManagedObjectContext {
    
    /// Fetches an array of `NSManagedObject`s.
    /// The entity name must match the class type name.
    ///
    /// - Parameters:
    ///   - entity: The entity type to fetch.  Example: `User.self`.
    ///   - predicate: The predicate to filter the fetch request
    ///   - sortDescriptors: An array of sort descriptors for sorting the fetch request.
    /// - Returns: An array of the specified entity type.
    func fetch<T: NSManagedObject>(_ entity: T.Type, _ predicate: NSPredicate? = nil, _ sortDescriptors: [NSSortDescriptor]? = nil) -> [T] {
        let request = entity.fetchRequest()
        request.predicate = predicate
        request.sortDescriptors = sortDescriptors
        
        do {
            return try fetch(request) as? [T] ?? []
        } catch {
            assertionFailure(error.localizedDescription)
            return []
        }
    }
    
    /// Fetches the first `NSManagedObject` that matches a predicate.
    /// The entity name must match the class type name.
    ///
    /// - Parameters:
    ///   - entity: The entity type to fetch.  Example: `User.self`.
    ///   - predicate: The predicate to filter the fetch request
    ///   - sortDescriptors: An array of sort descriptors for sorting the fetch request.
    /// - Returns: The first `NSManagedObject` matching the predicate.
    func fetchFirst<T: NSManagedObject>(_ entity: T.Type, _ predicate: NSPredicate? = nil, _ sortDescriptors: [NSSortDescriptor]? = nil) -> T? {
        let request = entity.fetchRequest()
        request.predicate = predicate
        request.sortDescriptors = sortDescriptors
        request.fetchLimit = 1
        
        do {
            let results = try fetch(request) as? [T]
            return results?.first
        } catch {
            assertionFailure(error.localizedDescription)
            return nil
        }
    }
    
    /// Efficiently returns the count of a fetch request.
    ///
    /// - Parameters:
    ///   - entity: The type of entity for the fetch request.
    ///   - predicate: The predicate to filter the fetch request.
    /// - Returns: The count of entities matching the fetch request.
    func fetchCount<T: NSManagedObject>(_ entity: T.Type, _ predicate: NSPredicate? = nil) -> Int {
        let request = entity.fetchRequest()
        request.predicate = predicate
        
        do {
            return try count(for: request)
        } catch {
            assertionFailure(error.localizedDescription)
            return 0
        }
    }
    
    /// Initializes a new NSFetchRequest, sets it with the given Entity name, and returns it
    ///
    /// - Parameter name: The name of the Entity to be added to the requestion
    /// - Returns: A new NSFetchRequest, initialized with the given Entity name
    func fetchRequest(for name: String) -> NSFetchRequest<NSManagedObject> {
        guard let entity = NSEntityDescription.entity(forEntityName: name, in: self) else {
            fatalError()
        }
        
        let request = NSFetchRequest<NSManagedObject>()
        request.entity = entity
        return request
    }
    
    /// Saves the context
    func saveContext() {
        do {
            try save()
        } catch {
            #if DEBUG
            print(error as NSError)
            #endif
            
            assertionFailure(error.localizedDescription)
        }
    }
}
