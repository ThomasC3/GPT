//
//  HistoryTableViewCell.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class HistoryTableViewCell: UITableViewCell {

    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var passengerStackView: PassengerStackView!
    @IBOutlet private weak var ratingStackView: UIStackView!
    @IBOutlet private weak var paymentStackView: UIStackView!
    @IBOutlet private weak var tipStackView: UIStackView!
    @IBOutlet private weak var pickupLabel: Label!
    @IBOutlet private weak var dropoffLabel: Label!
    @IBOutlet private weak var rideLabel: Label!
    @IBOutlet private weak var tipLabel: Label!
    @IBOutlet private weak var pickupSubLabel: Label!
    @IBOutlet private weak var dropoffSubLabel: Label!
    @IBOutlet private weak var priceSubLabel: Label!
    @IBOutlet private weak var tipSubLabel: Label!
    @IBOutlet private weak var missingRatingLabel: Label!
    
    
    override func awakeFromNib() {
        super.awakeFromNib()

        nameLabel.style = .subtitle3bluegray
        [pickupSubLabel, dropoffSubLabel, priceSubLabel, tipSubLabel].forEach { $0.style = .subtitle3blue }
        [pickupLabel, dropoffLabel, rideLabel, tipLabel].forEach { $0.style = .body2bluegray }
        missingRatingLabel.style = .body2tangerine
        pickupSubLabel.text = "Pickup".localize()
        dropoffSubLabel.text = "Dropoff".localize()
        priceSubLabel.text = "Ride Price".localize()
        tipSubLabel.text = "Driver Tip".localize()
    }

    func configure(with item: RideResponse, tipsEnabled: Bool) {
        nameLabel.text = item.driverName
        pickupLabel.text = item.origin.address
        dropoffLabel.text = item.destination.address
        passengerStackView.update(passengers: item.passengers)

        if let rating = item.rating {
            missingRatingLabel.isHidden = true
            ratingStackView.isHidden = false
            ratingStackView.arrangedSubviews.forEach { ratingStackView.removeArrangedSubview($0) }
            for value in 1...5 {
                ratingStackView.addArrangedSubview(RatingIndicator(value: value, rating: rating))
            }
        } else {
            missingRatingLabel.isHidden = false
            missingRatingLabel.text = "ride_tap_to_rate".localize()
            ratingStackView.isHidden = true
        }
        
        
        if let paymentStatus = item.paymentStatus {
            paymentStackView.isHidden = false
            rideLabel.text = paymentStatus == "succeeded" ? Ride.getRidePaymentsDetails(totalPrice: item.totalPrice, discount: item.discount, totalWithoutDiscount: item.totalWithoutDiscount, currency: item.currency) : "payments_payment_not_completed".localize()
        } else {
            paymentStackView.isHidden = true
        }
        
        if tipsEnabled {
            tipStackView.isHidden = false
            if let tipTotal = item.tipTotal, let tipCurrency = item.tipCurrency {
                tipLabel.text = tipTotal.toPrice(with: tipCurrency)
                tipLabel.style = .body2bluegray
            } else {
                tipLabel.text = "ride_tap_to_tip".localize()
                tipLabel.style = .body2tangerine
            }
        } else {
            tipStackView.isHidden = true
        }
    }
}
