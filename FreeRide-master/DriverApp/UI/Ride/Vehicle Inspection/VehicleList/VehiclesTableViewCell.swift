//
//  VehiclesTableViewCell.swift
//  FreeRide
//

import UIKit

class VehiclesTableViewCell: UITableViewCell {

    @IBOutlet weak var vehicleIcon: UIImageView!
    @IBOutlet private weak var cardBackgroundView: CardView!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var descriptionLabel: Label!
    @IBOutlet weak var detailsStackView: UIStackView!
    @IBOutlet private weak var readingsTitle: Label!
    @IBOutlet private weak var readingsLabel: Label!
    @IBOutlet weak var matchingRuleStackView: UIStackView!
    @IBOutlet private weak var matchingTitle: Label!
    @IBOutlet private weak var matchingLabel: Label!
    @IBOutlet weak var zonesStackView: UIStackView!
    @IBOutlet private weak var zonesTitle: Label!
    @IBOutlet private weak var zonesLabel: Label!
    @IBOutlet weak var licensePlateLabel: Label!
    @IBOutlet weak var licensePlateSpacer: UIView!
    
    override func awakeFromNib() {
        super.awakeFromNib()
        contentView.accessibilityIdentifier = "vehicleTableViewCell"
        cardBackgroundView.backgroundColor = Theme.Colors.white
        nameLabel.style = .body5seafoam
        nameLabel.accessibilityIdentifier = "vehicleNameLabel"
        descriptionLabel.style = .body3bluegray
        descriptionLabel.accessibilityIdentifier = "vehicleDescriptionLabel"

        [readingsTitle, matchingTitle, zonesTitle].forEach { $0.style = .subtitle3blue }
        [readingsLabel, matchingLabel, zonesLabel].forEach { $0.style = .body2bluegray }

        if let descriptor = licensePlateLabel.font.fontDescriptor.withDesign(.rounded) {
            licensePlateLabel.font = UIFont(descriptor: descriptor, size: 14)
        }
        licensePlateLabel.edgeInsets = .init(top: 2, left: 8, bottom: 2, right: 8)
        licensePlateLabel.layer.cornerRadius = 8
        licensePlateLabel.layer.masksToBounds = true
        licensePlateLabel.isHidden = true
        licensePlateSpacer.isHidden = true
    }

    func configure(with vehicle: VehicleResponse) {
        nameLabel.text = "\(vehicle.name) (\(vehicle.publicId))"
        descriptionLabel.text =  vehicle.getDescription()
        readingsLabel.text =  vehicle.getLastReadings()

        if let licensePlate = vehicle.licensePlate, !licensePlate.trim().isEmpty {
            licensePlateLabel.text = licensePlate
            licensePlateLabel.isHidden = false
            licensePlateSpacer.isHidden = false
        }
        else {
            licensePlateLabel.isHidden = true
            licensePlateSpacer.isHidden = true
        }

        if let matchingRule = vehicle.matchingRule {
            matchingRuleStackView.isHidden = false
            matchingLabel.text = matchingRule.title
        }
        else {
            matchingRuleStackView.isHidden = true
        }

        if let zones = vehicle.zones, !zones.isEmpty {
            zonesStackView.isHidden = false
            zonesLabel.text = zones.map({ $0.name }).joined(separator: ", ")
        }
        else {
            zonesStackView.isHidden = true
        }

        vehicleIcon.tintColor = Theme.Colors.seaFoam
        vehicleIcon.image = vehicle.getImage()
    }

}
