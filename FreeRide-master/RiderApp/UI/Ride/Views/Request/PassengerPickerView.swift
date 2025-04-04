//
//  PassengerPickerView.swift
//  FreeRide
//

import UIKit

protocol PassengerPickerViewDelegate: AnyObject {
    func updatePassengerNumber(withPassengers passengers: Int)
}

class PassengerPickerView: UIView {
    
    @IBOutlet weak var passangerTitleSectionLabel: Label!
    @IBOutlet private weak var passengerTitleLabel: Label?
    @IBOutlet weak var ridersControl: UISegmentedControl!
    
    var passengerNumber = 0
    
    weak var delegate: PassengerPickerViewDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(150)
                
        passangerTitleSectionLabel.style = .subtitle6blue
        passangerTitleSectionLabel.textColor = Theme.Colors.seaFoam
        passangerTitleSectionLabel.text = "passengers".localize()
        passengerTitleLabel?.style = .subtitle3darkgray
        passengerTitleLabel?.text = "ride_number_of_riders".localize()

        ridersControl.setTitleTextAttributes([NSAttributedString.Key.foregroundColor: UIColor.white], for: .selected)
        ridersControl.accessibilityIdentifier = "numberOfRidersSegmentedControl"
    }
    
    func setPassengerNumber(passengers: Int) {
        passengerNumber = passengers
        ridersControl.selectedSegmentIndex = passengers - 1
    }
    
    @IBAction func passengerValueChanged(_ sender: UISegmentedControl) {
        passengerNumber = sender.selectedSegmentIndex + 1
        delegate?.updatePassengerNumber(withPassengers: passengerNumber)
    }

}
