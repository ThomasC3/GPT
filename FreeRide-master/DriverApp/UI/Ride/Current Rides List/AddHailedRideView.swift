//
//  AddHailedRideView.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/12/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol AddHailedRideViewDelegate: AnyObject {
    func addHailedRide(forPassengers passengers: Int, isADA: Bool)
}

class AddHailedRideView: UIView {

    @IBOutlet private weak var minusButton: UIButton!
    @IBOutlet private weak var plusButton: UIButton!
    @IBOutlet private weak var passengerTitleLabel: Label?
    @IBOutlet private weak var passengerNumberLabel: Label?
    @IBOutlet private weak var requestButton: Button?
    @IBOutlet private weak var accessibilityToggle: UISwitch!

    weak var delegate: AddHailedRideViewDelegate?

    private var passengerNumber = 1 {
        didSet {
            passengerNumberLabel?.text = "\(passengerNumber)"
        }
    }

    var isRequestEnabled: Bool {
        get { return requestButton?.isEnabled ?? false }
        set { requestButton?.isEnabled = newValue }
    }

    override func awakeFromNib() {
        super.awakeFromNib()
        
        minusButton.accessibilityIdentifier = "hailedRideMinusButton"
        plusButton.accessibilityIdentifier = "hailedRidePlusButton"

        passengerTitleLabel?.style = .subtitle1darkgray
        passengerNumberLabel?.style = .stepperTitle
        requestButton?.style = .primary
        accessibilityToggle.onTintColor = Theme.Colors.seaFoam
    }

    func reset() {
        passengerNumber = 1
        accessibilityToggle.isOn = false
        requestButton?.isEnabled = true
    }

    @IBAction private func passengerAction(_ button: UIButton) {
        let isIncrement = button.tag == 1
        let passengers = passengerNumber + (isIncrement ? 1 : -1)

        passengerNumber = passengers.clamped(to: 1...5)
    }

    @IBAction private func requestAction() {
        requestButton?.isEnabled = false
        delegate?.addHailedRide(forPassengers: passengerNumber, isADA: accessibilityToggle.isOn)
    }
}
