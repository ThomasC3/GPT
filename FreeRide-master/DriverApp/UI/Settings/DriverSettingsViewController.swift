//
//  DriverSettingsViewController.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class DriverSettingsViewController: SettingsViewController {

    private let termsID = "tos"
    private let privacyID = "privacy"
    private let logoutID = "logout"

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu

        title = "Settings"

        super.viewDidLoad()
    }

    override func initializeTableView() {
        super.initializeTableView()

        tableView.delegate = self

        dataSource.items = [SettingsItem(id: termsID, image: #imageLiteral(resourceName: "round_library_books_black_36pt"), title: "Terms & Conditions"),
                            SettingsItem(id: privacyID, image: #imageLiteral(resourceName: "round_library_books_black_36pt"), title: "Privacy Policy"),
                            SettingsItem(id: logoutID, image: #imageLiteral(resourceName: "round_toggle_off_black_36pt"), title: "Log out")]
        dataSource.refresh()
        tableView.reloadData()
    }
}

extension DriverSettingsViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)

        switch item.id {
        case termsID, privacyID:
            let vc = LegalViewController()
            vc.type = item.id == termsID ? .terms : .privacy
            navigationController?.pushViewController(vc, animated: true)
        case logoutID:
            
            if !context.dataStore.fetchCurrentActions().isEmpty {
                presentAlert("Please clear your queue", message: "You need to complete your rides before you can log out from your account.")
                return
            }
            
            if context.currentUser.isAvailable {
                presentAlert("Please change your availability", message: "You need to become unavailable before you can log out from your account.")
                return
            }
            
            if let vehicle = context.currentVehicle {
                presentAlert("Please check in first", message: "You need to check in vehicle \(vehicle.name) before you can log out from your account.")
                return
            }
            
            let confirm = UIAlertAction(title: "Yes", style: .default) { _ in
                self.logout()
            }

            presentAlert("Ready to Log Out?", message: "Are you sure you want to log out?", cancel: "Cancel", confirm: confirm)
        default:
            break
        }
    }

    private func logout() {
        guard let user = self.context.dataStore.currentUser() else {
            return
        }

        ProgressHUD.show()
        let deviceToken = Defaults.deviceToken != nil ? Defaults.deviceToken : "token_unavailable"
        let request = LogoutRequest(deviceToken: deviceToken)
        context.api.logout(request: request) { result in
            ProgressHUD.dismiss()

            switch result {
            case .success(_):
                self.context.dataStore.wipeLocation()
                self.context.dataStore.wipeCurrentRides()
                self.context.dataStore.wipeVehicles()
                
                self.context.socket.disconnect()
                self.context.dataStore.mainContext.delete(user)

                self.context.dataStore.save()

                KeychainManager.shared.deleteAccessToken()

                User.resetUserDefaults()
                                
                let vc = LoginViewController()
                let navVC = NavigationController(rootViewController: vc)
                UIApplication.shared.activeWindow?.rootViewController = navVC
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}
