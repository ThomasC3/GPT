//
//  RideNotificationView.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol RideNotificationViewDelegate: AnyObject {
    func didButtonAction(rideID: String, style: RideNotificationView.Style)
}

class RideNotificationView: CardView {

    enum Style {
        case added
        case contact
        case message

        var badge: UIImage? {
            switch self {
            case .added:
                return #imageLiteral(resourceName: "round_person_black_36pt")
            case .contact:
                return #imageLiteral(resourceName: "baseline_call_black_36pt")
            case .message:
                return #imageLiteral(resourceName: "baseline_mail_outline_black_36pt")
            }
        }

        var buttonStyle: Button.Style? {
            switch self {
            case .contact, .message:
                return .primary
            default:
                return nil
            }
        }

        var buttonTitle: String? {
            switch self {
            case .contact:
                return "Contact"
            case .message:
                return "View"
            default:
                return nil
            }
        }
    }

    @IBOutlet private weak var badgeImageView: UIImageView!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var button: Button!
    @IBOutlet private weak var paxLabel: Label!
    weak var delegate: RideNotificationViewDelegate?

    private(set) var rideID: String?
    private(set) var style: Style?

    func configure(with response: RideReceivedResponse) {
        rideID = response.ride
        style = .added

        nameLabel.text = "\(response.rider.name.capitalized)"
        
        if response.isADA {
            nameLabel.text = "\(nameLabel.text ?? "") ♿"
        }
        
        paxLabel.text = "\(response.passengers) pax"

        guard let style = style else {
            return
        }

        badgeImageView.image = style.badge
        badgeImageView.tintColor = Theme.Colors.seaFoam

        let buttonStyle = style.buttonStyle
        button.style = buttonStyle
        button.isHidden = buttonStyle == nil
        button.setTitle(style.buttonTitle, for: .normal)
    }

    func configure(with ride: Ride, style: Style) {
        rideID = ride.id
        self.style = style
        
        if let name = ride.riderName {
            nameLabel.text = "\(name.capitalized)"
        }
        
        if ride.isADA {
            nameLabel.text = "\(nameLabel.text ?? "") ♿"
        }
        
        paxLabel.text = "\(ride.passengers) pax"

        badgeImageView.image = style.badge

        let buttonStyle = style.buttonStyle
        button.style = buttonStyle
        button.isHidden = buttonStyle == nil
        button.setTitle(style.buttonTitle, for: .normal)
    }

    @IBAction private func buttonAction() {
        guard let rideID = rideID, let style = style else {
            return
        }

        delegate?.didButtonAction(rideID: rideID, style: style)
    }
}
