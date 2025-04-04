//
//  SettingsTableViewCell.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class SettingsTableViewCell: UITableViewCell {

    @IBOutlet private weak var settingImageView: UIImageView!
    @IBOutlet private weak var titleLabel: Label!
    @IBOutlet private weak var toggleSwitch: UISwitch!

    private var item: SettingsItem?

    func configure(with item: SettingsItem) {
        self.item = item
        
        if let image = item.image {
            settingImageView.image = image
            settingImageView.isHidden = false
        } else {
            settingImageView.isHidden = true
        }

        toggleSwitch.isHidden = item.toggle == nil
        toggleSwitch.onTintColor = Theme.Colors.seaFoam

        if let toggle = item.toggle {
            titleLabel.style = .menuToggleItemTitle
            toggleSwitch.isOn = toggle.value
            toggleSwitch.isEnabled = toggle.isEnabled
            titleLabel.text = toggle.value ? toggle.onTitle : toggle.offTitle
        } else {
            titleLabel.style = .menuItemTitle
            titleLabel.text = item.title
        }
    }

    @IBAction private func toggleAction() {
        if let toggle = item?.toggle {
            toggle.handler()

            titleLabel.text = toggleSwitch.isOn ? toggle.onTitle : toggle.offTitle
        }
    }
}
