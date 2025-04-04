//
//  ToggleActionView.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import UIKit

class ToggleActionView: UIView {

    struct ToggleStateStrings {

        let on: String
        let off: String
        let disabled: String
    }

    var actionHandler: ((Bool) -> Void)?
    var stateStrings: ToggleStateStrings?

    @IBOutlet private weak var toggleButton: UISwitch?
    @IBOutlet private weak var toggleLabel: UILabel?

    override func awakeFromNib() {
        super.awakeFromNib()

        constrainHeight(48)

        toggleLabel?.font = Theme.Fonts.title3
        toggleLabel?.textColor = Theme.Colors.blueGray
        toggleButton?.onTintColor = Theme.Colors.seaFoam
    }
    
    func setSwitchAccessibilityId(accessibilityId: String) {
        toggleButton?.accessibilityIdentifier = accessibilityId
    }

    func configure(stateStrings: ToggleStateStrings, action: @escaping (Bool) -> Void) {
        self.stateStrings = stateStrings
        actionHandler = action

        updateToggleLabel()
    }

    @IBAction private func toggleAction() {
        actionHandler?(toggleButton?.isOn ?? false)
        updateToggleLabel()
    }

    func updateToggleInteraction(isEnabled: Bool) {
        if isEnabled {
            toggleButton?.onTintColor = Theme.Colors.seaFoam
            toggleButton?.isEnabled = true
        } else {
            updateToggle(to: true)
            toggleLabel?.text = stateStrings?.disabled
            toggleButton?.onTintColor = Theme.Colors.tangerine
            toggleButton?.isEnabled = false
        }
        
    }
    
    func updateToggle(to isOn: Bool) {
        guard let stateStrings = stateStrings else {
            return
        }

        toggleButton?.isOn = isOn
        toggleLabel?.text = isOn ? stateStrings.on : stateStrings.off
    }

    private func updateToggleLabel() {
        guard let stateStrings = stateStrings,
            let isOn = toggleButton?.isOn else {
                return
        }

        toggleLabel?.text = isOn ? stateStrings.on : stateStrings.off
    }
}
