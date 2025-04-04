//
//  ViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class ViewController: UIViewController {

    var tabController: TabBarController? {
        return tabBarController as? TabBarController
    }

    var isShowing = false

    override func viewDidLoad() {
        super.viewDidLoad()

        applyTheme()

        navigationController?.isNavigationBarHidden = true
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        isShowing = true
        navigationController?.isNavigationBarHidden = true
        navigationController?.interactivePopGestureRecognizer?.isEnabled = true
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        isShowing = false
    }

    func applyTheme() {
        // Override this function in subclasses
    }
}
