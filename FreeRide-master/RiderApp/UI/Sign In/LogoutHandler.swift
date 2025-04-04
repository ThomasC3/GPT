//
//  LogoutHandler.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 15/07/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import UIKit

/// A protocol that defines the shared logic for handling user logout functionality.
protocol LogoutHandler: AnyObject {
    var context: RiderAppContext { get }
    /// Performs the logout operation for the current user.
    func logout()
}

extension LogoutHandler {
    
    func logout() {
        guard let user = self.context.dataStore.currentUser() else {
            return
        }

        ProgressHUD.show()

        let deviceToken = Defaults.deviceToken != nil ? Defaults.deviceToken : "token_unavailable"
        let request = LogoutRequest(deviceToken: deviceToken)

        self.context.dataStore.wipeLocation()
        self.context.dataStore.wipeRides()
        self.context.socket.disconnect()
        self.context.dataStore.mainContext.delete(user)
        if let location = self.context.dataStore.currentLocation() {
            self.context.dataStore.mainContext.delete(location)
        }
        self.context.dataStore.save()

        KeychainManager.shared.deleteAccessToken()
        User.resetUserDefaults()
        IntercomManager.logout()

        context.api.logout(request: request) { result in
            ProgressHUD.dismiss()
            Notification.post(.didLogout)
            let vc: WalkthroughViewController = .instantiateFromStoryboard()
            let navVC = NavigationController(rootViewController: vc)
            UIApplication.shared.activeWindow?.rootViewController = navVC
        }
    }

}
