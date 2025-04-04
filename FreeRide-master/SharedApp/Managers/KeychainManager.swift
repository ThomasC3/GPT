//
//  KeychainManager.swift
//  FreeRide
//

import Foundation
import KeychainSwift

protocol SecureDataStore {
    func get(_ key: String) -> String?
    func set(_ value: String, forKey key: String)
    @discardableResult func clear() -> Bool
}

extension KeychainSwift: SecureDataStore {

    func set(_ value: String, forKey key: String) {
        set(value, forKey: key, withAccess: nil)
    }

}

class KeychainManager {

    // Default instance which is shared globally.
    static let shared = KeychainManager(
        secureDataStore: KeychainSwift()
    )

    private let secureDataStore: SecureDataStore

    init(secureDataStore: SecureDataStore) {
        self.secureDataStore = secureDataStore
    }
    
    func saveAccessToken(_ token: String) {
        secureDataStore.set(token, forKey: "jwtAccessToken")
    }
    
    func getAccessToken() -> String? {
        return secureDataStore.get("jwtAccessToken")
    }
    
    func deleteAccessToken() {
        secureDataStore.clear()
    }

}
