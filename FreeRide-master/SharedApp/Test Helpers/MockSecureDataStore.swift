//
//  MockSecureDataStore.swift
//  RiderAppTests
//
//  Created by Ricardo Pereira on 26/07/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import Foundation

class MockSecureDataStore: SecureDataStore {

    private var keyValueStore: [String: String] = [:]

    func get(_ key: String) -> String? {
        return keyValueStore.keys.contains(key) ? keyValueStore[key] : nil
    }

    func set(_ value: String, forKey key: String) {
        keyValueStore.updateValue(value, forKey: key)
    }

    func clear() -> Bool {
        keyValueStore.removeAll()
        return true
    }

}
