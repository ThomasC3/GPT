//
//  AuthCompletionHandler.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 11/07/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import UIKit

protocol AuthCompletionHandler: AnyObject {
    #if DRIVER
    var context: DriverAppContext { get }
    #elseif RIDER
    var context: RiderAppContext { get }
    #endif
}

extension AuthCompletionHandler where Self: UIViewController {

    #if RIDER
    func finishRiderAuth(user: User) {
        GAManager.checkPermissionAndIdentifyUser(user)
        MixpanelManager.checkPermissionAndIdentifyUser(user)
        BugsnagManager.checkPermissionAndIdentifyUser(user)
        IntercomManager.checkPermissionAndIdentifyUser(user)

        ProgressHUD.show()
        self.context.api.getGlobalSettings() { [weak self] result in
            ProgressHUD.dismiss()
            guard let self = self else { return }

            switch result {
            case .success(let response):
                self.handleSuccessfulAuthentication(with: response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    private func handleSuccessfulAuthentication(with response: GlobalSettingsResponse) {
        Defaults.skipPhoneVerification = response.skipPhoneVerification
        Defaults.isDynamicRideSearch = response.isDynamicRideSearch
        Defaults.flux = response.flux
        Defaults.hideTripAlternativeSurvey = response.hideTripAlternativeSurvey

        let currentUser = RiderAppContext.shared.currentUser

        if !currentUser.hasDateOfBirth() {
            // User needs to complete their profile
            let vc = RegisterIncompleteViewController()
            navigationController?.pushViewController(vc, animated: true)
        } else if !currentUser.isPhoneVerified && !response.skipPhoneVerification {
            // User needs to verify their phone number
            let vc = PhoneVerifyViewController()
            vc.completingPhoneVerification = true
            UIApplication.shared.activeWindow?.rootViewController = NavigationController(rootViewController: vc)
        } else {
            // User is ok
            let vc = RiderTabBarController()
            UIApplication.shared.activeWindow?.rootViewController = vc
        }
    }
    #endif

}
