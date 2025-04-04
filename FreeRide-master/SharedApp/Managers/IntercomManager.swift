//  IntercomManager.swift
//  FreeRide
//

import Foundation
import Intercom
import AppTrackingTransparency

class IntercomManager {
    
    static func initialize(_ user: User) {
        
        if let apiKey = Bundle.main.object(forInfoDictionaryKey: "Intercom API Key") as? String, let appId = Bundle.main.object(forInfoDictionaryKey: "Intercom App Id") as? String, let userHash = user.iosUserIntercomHash {
            Intercom.setUserHash(userHash)
            Intercom.setApiKey(apiKey, forAppId: appId)
        }
    }
    
    static func checkPermissionAndIdentifyUser(_ user: User) {
        initialize(user)
        identifyUser(user)
    }
    
    static func loginUnidentifiedUser() {
               
        Intercom.loginUnidentifiedUser { result in
            switch result {
            case .success:
                print("Intercom unidentified login successful")
            case .failure(let error):
                print("Intercom unidentified login failure")
            }
        }
    }
    
    static func identifyUser(_ user: User, completion: (() -> Void)? = nil) {
    
        let attributes = ICMUserAttributes()
        attributes.userId = user.id
        attributes.email = user.email
        attributes.name = user.firstName + " " + user.lastName
        
        if let adminUrl = Bundle.main.object(forInfoDictionaryKey: "Admin URL") as? String {
            attributes.customAttributes = ["profile_url": adminUrl + "/riders/" + user.id]
        }

        Intercom.loginUser(with: attributes) { result in
            switch result {
            case .success:
                print("Intercom login successful")
                completion?()
            case .failure(let error):
                print("Intercom login failure: \(error)")
            }
        }
    }
    
    static func logout() {
        Intercom.logout()
    }
    
    static func showSupportWindow(_ user: User) {
        if Intercom.isUserLoggedIn() {
            Intercom.present()
        } else {
            initialize(user)
            identifyUser(user) {
                Intercom.present()
            }
        }
    }
    
    static func showLauncherVisibility() {
        Intercom.setLauncherVisible(true)
    }
    
    static func hideLauncherVisibility() {
        Intercom.setLauncherVisible(false)
    }
}
