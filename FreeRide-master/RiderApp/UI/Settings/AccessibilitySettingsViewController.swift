//
//  AccessibilitySettingsViewController.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class AccessibilitySettingsViewController: SettingsViewController {

    private let footerView: AccessibilityFooterView = .instantiateFromNib()
    
    lazy var accessibilityView: AccessibilityOptionsView = {
        let view: AccessibilityOptionsView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.constrainHeight(200)
        return view
    }()

    private let visibilityID = "visibility"

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu

        title = "settings_accessibility".localize()
        
        super.viewDidLoad()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        updateItems()
    }

    override func initializeTableView() {
        super.initializeTableView()
        setupItems()
    }
    
    override func addViewsBeforeTable() {
        
        middleStackView.addArrangedSubview(accessibilityView)
        accessibilityView.pinHorizontalEdges(to: middleStackView, constant: 20)
        accessibilityView.cornerRadius = 16
        accessibilityView.addShadow()
        accessibilityView.setForAccessibilitySection()
    }

    private func setupItems() {
        guard let location = context.currentLocation else {
                return
        }
        
        if location.isADA {
            updateItems()
            accessibilityView.update()
            accessibilityView.setTitle(title: "accessibility_toggle_title".localize())
        } else {
            footerView.isHidden = true
            accessibilityView.isHidden = true

            let alertLabel = Label()
            alertLabel.numberOfLines = 0
            alertLabel.style = .subtitle1darkgray
            alertLabel.text = "accessibility_not_available".localize()
            let margin: CGFloat = 35
            alertLabel.edgeInsets = .init(top: margin, left: margin, bottom: margin, right: margin)
            middleStackView.addArrangedSubview(alertLabel)
        }
    }

    private func updateItems() {
        accessibilityView.setAccessibilityState()

        let visibilityToggle = SettingsItem.Toggle(onTitle: "wav_request_toggle_title".localize(), offTitle: "wav_request_toggle_title".localize(), isEnabled: true, value: Defaults.showAccessibilityOnRequest) {
            Defaults.showAccessibilityOnRequest = !Defaults.showAccessibilityOnRequest
        }
        let visibilityItem = SettingsItem(id: visibilityID, toggle: visibilityToggle)

        dataSource.items = [visibilityItem]
        dataSource.refresh()
        tableView.reloadData()

        footerView.bounds.size.height = AccessibilityFooterView.recommendedHeight
        tableView.tableFooterView = footerView
    }

}
