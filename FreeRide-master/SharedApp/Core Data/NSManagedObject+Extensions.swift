//
//  NSManagedObject+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 7/1/18.
//  Copyright © 2018 Rocket n Mouse. All rights reserved.
//

import CoreData

extension NSManagedObject {
    
    /// Use `rawValue(_:)` when overriding an `@NSManaged` property is required
    ///
    /// - Parameter key: The key for the primitive value
    /// - Returns: The primitive value for this key
    func rawValue(_ key: String) -> Any? {
        willAccessValue(forKey: key)
        let value = primitiveValue(forKey: key)
        didAccessValue(forKey: key)
        return value
    }
    
    /// Use `setRawValue(_:key)` when overriding an `@NSManaged` property is required
    ///
    /// - Parameters:
    ///   - value: The value to set
    ///   - key: The key of the value to set
    func setRawValue(_ value: Any?, key: String) {
        willChangeValue(forKey: key)
        setPrimitiveValue(value, forKey: key)
        didChangeValue(forKey: key)
    }
}
