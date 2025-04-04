//
//  DataStore.swift
//  Circuit
//
//  Created by Andrew Boryk on 7/1/18.
//  Copyright © 2018 Rocket n Mouse. All rights reserved.
//

import CoreData

open class DataStore {
    
    /// Must match the name of the `xcdatamodel` file without the path extension.
    let name: String
    
    init(name: String) {
        self.name = name
    }
    
    /// When `true` and a migration failure occurs, the existing sqlite files will be deleted and a new copy will be created.
    ///
    /// Must be set before any properties are accessed.
    open var recreateOnMigrationFailure = true

    /// The NSManagedObjectContext associated with the main thread.
    /// Automatically merges updates when other contexts save to the store
    open lazy var mainContext: NSManagedObjectContext = {
        let context = persistentContainer.viewContext
        context.automaticallyMergesChangesFromParent = true
        context.mergePolicy = NSMergePolicy(merge: .overwriteMergePolicyType)
        return context
    }()
    
    /// Saves the data store
    open func save() {
        mainContext.saveContext()
    }
    
    /// The bundle that hosts the NSManagedObjectModel
    open var bundle: Bundle {
        return Bundle(for: type(of: self))
    }
    
    /// The URL of the sqlite file.
    open var sqliteURL: URL {
        return storageURL.appendingPathComponent(name).appendingPathExtension("sqlite")
    }
    
    /// The directory in which the store files will be saved
    open var storageURL: URL {
        guard let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            fatalError("The user's document directory does not exist.")
        }
        
        return documentsURL
    }
    
    /// A list of entity names provided by the model
    open var entityNames: Set<String> {
        return Set(model.entities.compactMap { $0.name })
    }
    
    /// The managed object model for the store
    open lazy var model: NSManagedObjectModel = {
        guard let modelURL = self.bundle.url(forResource: self.name, withExtension: "momd"),
            let model = NSManagedObjectModel(contentsOf: modelURL) else {
                fatalError("NSManagedObjectModel could not be loaded")
        }
        
        return model
    }()
    
    /// The persistant container for the store
    open lazy var persistentContainer: NSPersistentContainer = {
        let url = self.sqliteURL
        precondition(url.pathExtension == "sqlite")

        if !FileManager.default.fileExists(atPath: url.path) {
            let sourceSqliteURLs = [Bundle.main.url(forResource: name, withExtension: "sqlite"),
                                    Bundle.main.url(forResource: name, withExtension: "sqlite-wal"),
                                    Bundle.main.url(forResource: name, withExtension: "sqlite-shm")].compactMap { $0 }

            let destSqliteURLs = [storageURL.appendingPathComponent("\(name).sqlite"),
                                  storageURL.appendingPathComponent("\(name).sqlite-wal"),
                                  storageURL.appendingPathComponent("\(name).sqlite-shm")]

            for (index, url) in sourceSqliteURLs.enumerated() {
                do {
                    try FileManager.default.copyItem(at: url, to: destSqliteURLs[index])
                } catch {
                    print(error)
                }
            }
        }
        
        let description = NSPersistentStoreDescription(url: url)
        description.setOption(FileProtectionType.complete as NSObject?, forKey: NSPersistentStoreFileProtectionKey)
        
        let container = NSPersistentContainer(name: self.name, managedObjectModel: model)
        container.persistentStoreDescriptions = [description]
        container.loadPersistentStores { _, error in
            guard let loadError = error else {
                // success
                return
            }
            
            if !self.recreateOnMigrationFailure {
                fatalError("Could not load persistant store: \(loadError as NSError).")
            }
            
            // remove store that cannot be loaded
            try? container.persistentStoreCoordinator.destroyPersistentStore(at: url, ofType: NSSQLiteStoreType, options: nil)
            
            // load again now that previous store has been removed
            container.loadPersistentStores { _, error in
                if let createError = error {
                    fatalError("Could not create persistant store: \(createError as NSError)")
                }
            }
        }
        
        return container
    }()
    
    /// Returns `true` if there are no entities in the store
    open var isEmpty: Bool {
        for name in entityNames {
            let request = mainContext.fetchRequest(for: name)
            
            do {
                if try mainContext.count(for: request) > 0 {
                    return false
                }
            } catch {
                assertionFailure(error.localizedDescription)
            }
        }
        
        return true
    }
    
    /// Removes all entities from the store
    open func wipe() {
        do {
            for name in entityNames {
                let request = NSFetchRequest<NSManagedObject>(entityName: name)
                request.includesPropertyValues = false
                
                for object in try mainContext.fetch(request) {
                    mainContext.delete(object)
                }
            }
            
            try mainContext.save()
        } catch {
            assertionFailure(error.localizedDescription)
        }
    }
    
    deinit {
        let coordinator = persistentContainer.persistentStoreCoordinator
        
        for store in coordinator.persistentStores {
            try? coordinator.remove(store)
        }
    }
}
