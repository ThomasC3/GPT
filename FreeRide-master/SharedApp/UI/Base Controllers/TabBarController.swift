//
//  TabBarController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class TabBarController: UITabBarController {

    var controllers: [UIViewController] {
        get { return viewControllers ?? [] }
        set { viewControllers = newValue.map { NavigationController(rootViewController: $0) } }
    }

    lazy var menuViewController: MenuViewController = {
        let vc = MenuViewController()
        vc.parentTabBarController = self
        vc.delegate = self

        return vc
    }()

    private lazy var manager: SideViewManager = {
        let manager = SideViewManager(controller: menuViewController)
        manager.delegate = self
        manager.isRootViewAdaptive = true

        return manager
    }()

    override func viewDidLoad() {
        super.viewDidLoad()

        tabBar.isHidden = true
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        manager.setDismissGesture(isEnabled: true)
        manager.dismissGesture.delegate = self
    }

    func toggleMenu() {
        if manager.currentOffset == 1 {
            manager.dismiss()
        } else {
            manager.present()
        }
    }

    func presentMenu() {
        manager.present()
    }

    func dismissMenu() {
        manager.dismiss()
    }
}

extension TabBarController: MenuViewControllerDelegate {

    func menu(_ viewController: MenuViewController, didSelectRowAt index: Int) {
        selectedIndex = index
        manager.dismiss()
    }
}

extension TabBarController: SideViewManagerDelegate {

    func didFinishAnimating(to offset: CGFloat) {
        controllers.forEach { $0.view.isUserInteractionEnabled = offset == 0 }
    }

    func didChange(gesture: UIGestureRecognizer, to isEnabled: Bool) {

    }
}

extension TabBarController: UIGestureRecognizerDelegate {

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }
}
