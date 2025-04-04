//
//  MenuViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import Mixpanel

protocol MenuViewControllerDelegate: AnyObject {
    func menu(_ viewController: MenuViewController, didSelectRowAt index: Int)
}

class MenuViewController: TableViewController {

    weak var delegate: MenuViewControllerDelegate?

    var parentTabBarController: TabBarController?
    
    private let dataSource = MenuDataSource()
    
    let breakOptionsQuestion = ""

    #if DRIVER

    private lazy var offlineOnlineToggle: ToggleActionView = {
        let toggleView: ToggleActionView = .instantiateFromNib()
        toggleView.translatesAutoresizingMaskIntoConstraints = false
        
        let stateStrings = ToggleActionView.ToggleStateStrings(on: "Available", off: "Unavailable", disabled: "No vehicle")
        
        toggleView.updateToggle(to: context.dataStore.currentUser()?.isAvailable ?? false)
        
        toggleView.configure(stateStrings: stateStrings) { isOn in
            if !isOn {
                
                var reasons = self.context.currentUser.unavailabilityReasons
                
                var breaks = self.context.currentLocation?.breakDurations ?? []
                
                if !breaks.isEmpty {
                    reasons.append("I need to take a break")
                }
                
                if reasons.isEmpty {
                    self.requestAvailabilitySwitch(isOn: isOn, reason: nil)
                } else {
                    let vc = OptionsViewController()
                    vc.delegate = self
                    
                    let reasonsTitle = "Please select a reason for your unavailability"
                    if breaks.isEmpty {
                        vc.configureForDelegate(
                            with: reasonsTitle,
                            options: reasons)
                    } else {
                        vc.configureWithSubOptions(
                            with: reasonsTitle,
                            options: reasons,
                            subOptions: breaks.map { "Take a \($0) minute break" },
                            subOptionsTrigger: reasons.count - 1
                        )
                    }
                    
                    if #available(iOS 13.0, *) {
                        vc.isModalInPresentation = true
                    }
                    self.present(vc, animated: true)
                }
            } else {
                self.requestAvailabilitySwitch(isOn: isOn, reason: nil)
            }
        }
        toggleView.setSwitchAccessibilityId(accessibilityId: "driverAvailabilityToggle")
        return toggleView
    }()
    
    func requestAvailabilitySwitch(isOn: Bool, reason: String?) {
        ProgressHUD.show()
        
        let request = PostDriverStatusRequest(isAvailable: isOn, reason: reason)
        context.api.postDriverStatus(request: request) { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                //change availability setting
                let currentUser = self.context.currentUser
                currentUser.update(with: response)
                //update vehicle
                let ds = self.context.dataStore
                ds.wipeVehicles()
                if let v = response.vehicle {
                    let vehicle = Vehicle(context: self.context.dataStore.mainContext)
                    vehicle.update(with: v)
                }
                MixpanelManager.trackEvent(
                    isOn ? MixpanelEvents.DRIVER_AVAILABLE : MixpanelEvents.DRIVER_UNAVAILABLE,
                    properties: [
                        "reason": reason ?? "",
                    ]
                )
            case .failure(let error):
                self.presentAlert(for: error)
            }
            Notification.post(.didUpdateDriverStatus)
        }
    }

    #endif

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = Theme.Colors.white
        tableView.tableHeaderView = UIView(frame: .zero)

        #if DRIVER

        bottomView.stackView.addArrangedSubview(offlineOnlineToggle)
        offlineOnlineToggle.pinHorizontalEdges(to: bottomView)

        Notification.addObserver(self, name: .didUpdateDriverStatus, selector: #selector(didUpdateDriverStatus))
        
        #endif
    }

    override func initializeTableView() {
        super.initializeTableView()
        reloadMenuItems()

        tableView.rowHeight = 60
        tableView.bounces = false

        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource
        tableView.delegate = self
        tableView.reloadData()
    }

    func reloadMenuItems() {
        if let controllers = parentTabBarController?.viewControllers {
            let items: [MenuItem] = controllers.compactMap {
                guard var itemTitle = $0.tabBarItem.title,
                    let image = $0.tabBarItem.image,
                    let index = controllers.firstIndex(of: $0) else {
                        return nil
                }

                if index == 0 {
                    #if RIDER
                    itemTitle = NSLocalizedString("menu_ride", comment: "")
                    #elseif DRIVER
                    itemTitle = "Drive"
                    #endif
                }

                return MenuItem(title: itemTitle, image: image, index: index)
            }

            dataSource.refresh(items: items)
        }
    }

    #if DRIVER

    @objc private func didUpdateDriverStatus() {
        guard let location = self.context.currentLocation else {
            offlineOnlineToggle.updateToggle(to: false)
            return
        }
        
        let isAvailable = self.context.currentUser.isAvailable
        let toggleEnabled = context.currentVehicle != nil || !location.fleetEnabled
        offlineOnlineToggle.updateToggleInteraction(isEnabled: toggleEnabled)
        if toggleEnabled {
            offlineOnlineToggle.updateToggle(to: isAvailable)
        }
    }

    #endif
}

#if DRIVER

extension MenuViewController: OptionsViewDelegate {
    func didSelectOptionValue(vc: OptionsViewController, value: String) {
        requestAvailabilitySwitch(isOn: false, reason: value)
    }
    func didSelectOptionIndex(vc: OptionsViewController, indexPath: IndexPath) {}
    func didNotSelectOption() {
        self.offlineOnlineToggle.updateToggle(to: true)
    }
}

#endif

extension MenuViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)

        guard let tabBarVC = parentTabBarController,
            item.index < tabBarVC.viewControllers?.count ?? 0 else {
                return
        }
        
        #if RIDER
        if item.title == "settings_logout".localize() {
            let confirm = UIAlertAction(title: "general_yes".localize(), style: .default) { _ in
                self.logout()
            }
            presentAlert("settings_ready_logout".localize(), message: "settings_ready_logout_info".localize(), cancel: "general_cancel".localize(), confirm: confirm)
            return
        }
    
        if item.title == "settings_contact".localize() {
            let context = RiderAppContext.shared
            IntercomManager.showSupportWindow(context.currentUser)
            return
        }
        #endif
    
        delegate?.menu(self, didSelectRowAt: item.index)
    }
    
}

#if RIDER
extension MenuViewController: LogoutHandler {
    // Adds log out functionality.
}
#endif
