//
//  RiderTabBarController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class RiderTabBarController: TabBarController {

    let homeVC: RiderHomeViewController = {
        let viewController = RiderHomeViewController()
        viewController.tabBarItem = UITabBarItem(title: "menu_ride".localize(), image: #imageLiteral(resourceName: "round_flag_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_flag_black_36pt"))
        return viewController
    }()

    let historyVC: HistoryViewController = {
        let viewController = HistoryViewController()
        viewController.tabBarItem = UITabBarItem(title: "menu_ride_history".localize(), image: #imageLiteral(resourceName: "round_hourglass_full_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_hourglass_full_black_36pt"))
        return viewController
    }()

    let paymentsVC: PaymentsViewController = {
        let viewController = PaymentsViewController()
        viewController.tabBarItem = UITabBarItem(title: "menu_payments".localize(), image: #imageLiteral(resourceName: "round_credit_card_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_credit_card_black_36pt"))
        return viewController
    }()

    let locationsVC: LocationsViewController = {
        let viewController = LocationsViewController()
        viewController.tabBarItem = UITabBarItem(title: "menu_locations".localize(), image: #imageLiteral(resourceName: "round_explore_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_explore_black_36pt"))
        return viewController
    }()

    let profileVC: ProfileViewController = {
        let viewController = ProfileViewController()
        viewController.tabBarItem = UITabBarItem(title: "menu_edit_profile".localize(), image: #imageLiteral(resourceName: "round_person_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_person_black_36pt"))
        return viewController
    }()

    let settingsVC: RiderSettingsViewController = {
        let viewController = RiderSettingsViewController()
        viewController.tabBarItem = UITabBarItem(title: "menu_more_options".localize(), image: #imageLiteral(resourceName: "round_add_circle_outline_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_add_circle_outline_black_36pt"))
        return viewController
    }()

    let accessibilityVC: AccessibilitySettingsViewController = {
        let viewController = AccessibilitySettingsViewController()
        viewController.tabBarItem = UITabBarItem(title: "settings_accessibility".localize(), image: #imageLiteral(resourceName: "round_accessible_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_accessible_black_36pt"))
        return viewController
    }()

    let logoutOption: RiderHomeViewController = {
        let viewController = RiderHomeViewController()
        viewController.tabBarItem = UITabBarItem(title: "settings_logout".localize(), image: #imageLiteral(resourceName: "round_exit_to_app_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_exit_to_app_black_36pt"))
        return viewController
    }()
    
    let contactOption: RiderHomeViewController = {
        let viewController = RiderHomeViewController()
        viewController.tabBarItem = UITabBarItem(title: "settings_contact".localize(), image: #imageLiteral(resourceName: "round_question_answer_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_question_answer_black_36pt"))
        return viewController
    }()

    let runtimeDebuggerVC: RuntimeDebuggerViewController = {
        let viewController = RuntimeDebuggerViewController()
        if #available(iOS 13.0, *) {
            viewController.tabBarItem = UITabBarItem(
                title: "Debugger",
                image: UIImage(systemName: "ladybug.fill"),
                selectedImage: UIImage(systemName: "ladybug.fill")
            )
        }
        return viewController
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        updateControllers()
        Notification.addObserver(self, name: .didUpdateCurrentLocation, selector: #selector(updateMenu))
    }

    @objc func updateMenu() {
        updateControllers()
        menuViewController.reloadMenuItems()
        menuViewController.tableView.reloadData()
    }

    private func updateControllers() {
        var menuControllers: [UIViewController] = [
            homeVC,
            locationsVC,
            paymentsVC,
            historyVC,
            contactOption,
            accessibilityVC,
            settingsVC,
            profileVC,
            logoutOption
        ]

        // Accessibility
        if let location = context.dataStore.currentLocation(), !location.isADA {
            menuControllers.removeAll(where: { $0 === accessibilityVC })
        }

        // Runtime Debugger
        #if STAGING || DEVELOP
        menuControllers = menuControllers + [runtimeDebuggerVC]
        #endif

        controllers = menuControllers
    }

}
