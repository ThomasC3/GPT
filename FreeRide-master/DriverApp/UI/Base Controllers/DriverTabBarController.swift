//
//  DriverTabBarController.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class DriverTabBarController: TabBarController {

    override func viewDidLoad() {
        super.viewDidLoad()

        let homeVC = DriverHomeViewController()
        homeVC.tabBarItem = UITabBarItem(title: "Drive", image: #imageLiteral(resourceName: "round_flag_black_24pt"), selectedImage: #imageLiteral(resourceName: "round_flag_black_24pt"))

        let locationsVC = LocationsViewController()
        locationsVC.tabBarItem = UITabBarItem(title: "Locations", image: #imageLiteral(resourceName: "round_explore_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_explore_black_36pt"))
        
        let dashboardVC = DashboardViewController()
        dashboardVC.tabBarItem = UITabBarItem(title: "Dashboard", image: #imageLiteral(resourceName: "round_insert_chart_outlined_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_insert_chart_outlined_black_36pt"))

        let profileVC = ProfileViewController()
        profileVC.tabBarItem = UITabBarItem(title: "Edit Profile", image: #imageLiteral(resourceName: "round_person_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_person_black_36pt"))
        
        let tipsVC = TipsViewController()
        tipsVC.tabBarItem = UITabBarItem(title: "Tips", image: #imageLiteral(resourceName: "round_attach_money_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_attach_money_black_36pt"))

        let settingsVC = DriverSettingsViewController()
        settingsVC.tabBarItem = UITabBarItem(title: "Settings", image: #imageLiteral(resourceName: "round_settings_black_36pt"), selectedImage: #imageLiteral(resourceName: "round_settings_black_36pt"))

        let menuControllers = [homeVC, locationsVC, dashboardVC, profileVC, tipsVC, settingsVC]

        #if STAGING || DEVELOP
        let runtimeDebuggerViewController = RuntimeDebuggerViewController()
        if #available(iOS 13.0, *) {
            runtimeDebuggerViewController.tabBarItem = UITabBarItem(
                title: "Debugger",
                image: UIImage(systemName: "ladybug.fill"),
                selectedImage: UIImage(systemName: "ladybug.fill")
            )
        }
        controllers = menuControllers + [runtimeDebuggerViewController]
        #else
        controllers = menuControllers
        #endif
    }
}
