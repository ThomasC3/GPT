//
//  RatingRideView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/20/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import CoreLocation

protocol RatingRideViewDelegate: AnyObject {
    func didSelectRating(rating: Int)
    func didSelectReason()
}

class RatingRideView: UIView {
    
    @IBOutlet var titleLabels: [Label]!
    @IBOutlet var detailLabels: [Label]!
    @IBOutlet var stackTitleLabels: [Label]!
    @IBOutlet weak var personTitle: Label!
    @IBOutlet weak var personLabel: Label!
    @IBOutlet weak var pickupTitle: Label!
    @IBOutlet weak var pickupLabel: Label!
    @IBOutlet weak var dropoffTitle: Label!
    @IBOutlet weak var dropoffLabel: Label!
    @IBOutlet weak var priceTitle: Label!
    @IBOutlet weak var priceLabel: Label!
    @IBOutlet weak var tipTitle: Label!
    @IBOutlet weak var tipLabel: Label!
    @IBOutlet weak var summaryStackTitle: Label!
    @IBOutlet weak var tipStackTitle: Label!
    @IBOutlet weak var feedbackStackTitle: Label!
    @IBOutlet weak var driverTipStackView: UIStackView!
    @IBOutlet weak var priceStackView: UIStackView!
    @IBOutlet weak var rideTipStackView: UIStackView!
    @IBOutlet private weak var ratingStackView: UIStackView!
    @IBOutlet private weak var reportReasonLabel: Label!
    @IBOutlet weak var driverTipControl: UISegmentedControl!
    @IBOutlet weak var driverTipsDividerView: UIView!
    
    weak var delegate: RatingRideViewDelegate?

    var rating = 0 {
        didSet {
            updateRatingUI()
        }
    }
    
    var driverTip = 0
    var driverTipOptions : [Int] = []
    private var maxCustomValue = 0
    private var currency : String = ""
    
    private lazy var ratingButtons: [RatingButton] = {
        return Array(1...5).map { RatingButton(tag: $0, completion: { tag in
            self.rating = tag
            self.delegate?.didSelectRating(rating: self.rating)
        })}
    }()

    override func awakeFromNib() {
        super.awakeFromNib()

        rating = 0
        ratingButtons.forEach { ratingStackView.addArrangedSubview($0) }
        reportReasonLabel.isHidden = true
        titleLabels.forEach { $0.style = .subtitle3blue }
        detailLabels.forEach { $0.style = .body2bluegray }
        stackTitleLabels.forEach { $0.style = .subtitle6bluegray }
        driverTipControl.setTitleTextAttributes([NSAttributedString.Key.foregroundColor: UIColor.white], for: .selected)
        summaryStackTitle.text = "Your ride summary".localize()
        tipStackTitle.text = "driver_tip_title".localize()
        feedbackStackTitle.text = "Tell us about your ride".localize()
    }
    
    func setRatingForReport() {
        rating = 1
        ratingStackView.isHidden = true
        feedbackStackTitle.isHidden = true
        summaryStackTitle.text = "Ride canceled"
    }

    func configure(with rideSummary: RideSummary, location: Location) {
        reportReasonLabel.isHidden = true
        
        reportReasonLabel.style = .subtitle1darkgray
        reportReasonLabel.isUserInteractionEnabled = true
        reportReasonLabel.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(RatingRideView.reasonLabelTapped)))
        
        pickupLabel.text = rideSummary.originAddress
        dropoffLabel.text = rideSummary.destinationAddress
        
        pickupTitle.text = "Pickup".localize();
        dropoffTitle.text = "Dropoff".localize();
      
        #if DRIVER
        personTitle.text = "Rider"
        personLabel.text = rideSummary.riderName
        priceStackView.isHidden = true
        rideTipStackView.isHidden = true
        manageTipVisibility(shouldShowTips: false)
        #elseif RIDER
        personTitle.text = "ride_your_driver".localize()
        personLabel.text = rideSummary.driverName
                
        if location.tipEnabled && rideSummary.tipTotal == 0 {
            manageTipVisibility(shouldShowTips: true)
            currency = location.tipCurrency
            maxCustomValue = Int(location.tipMaxCustomValue)
            driverTipOptions = location.tipOptions.map{ Int(truncating: $0) }
            for (index, option) in driverTipOptions.enumerated() {
                driverTipControl.setTitle(option.toPrice(with: currency), forSegmentAt: index)
            }
            driverTipControl.setTitle("pwyw_more".localize(), forSegmentAt: driverTipControl.numberOfSegments - 1)
            driverTipControl.setTitle("driver_tip_no_tip".localize(), forSegmentAt: 0)
            driverTipOptions[0] = 0
        } else {
            manageTipVisibility(shouldShowTips: false)
        }
        
        if let paymentStatus = rideSummary.paymentStatus {
            priceStackView.isHidden = false
            priceTitle.text = "Ride Price".localize()
            priceLabel.text = paymentStatus == "succeeded" ? Ride.getRidePaymentsDetails(totalPrice: Int(rideSummary.totalPrice), discount: Int(rideSummary.discount), totalWithoutDiscount: Int(rideSummary.totalWithoutDiscount), currency: rideSummary.currency) : "payments_payment_not_completed".localize()
        } else {
            priceStackView.isHidden = true
        }
        
        if rideSummary.tipTotal > 0, let tipCurrency = rideSummary.tipCurrency {
            rideTipStackView.isHidden = false
            tipTitle.text = "Driver Tip".localize()
            tipLabel.text = Int(rideSummary.tipTotal).toPrice(with: tipCurrency)
        } else {
            rideTipStackView.isHidden = true
        }
        
        rating = Int(rideSummary.rating)
        updateRatingUI()
        
        #endif
    }
    
    func manageTipVisibility(shouldShowTips: Bool) {
        driverTipStackView.isHidden = !shouldShowTips
        driverTipsDividerView.isHidden = !shouldShowTips
    }
    
    func configureReportReason(_ reason: String?) {
        if reason == nil {
            reportReasonLabel.isHidden = true
        } else {
            reportReasonLabel.isHidden = false
            let attrs = [NSAttributedString.Key.font : Theme.Fonts.body5]
            let attributedString = NSMutableAttributedString(string: "\("Report reason".localize()):\n", attributes:attrs as [NSAttributedString.Key : Any])
            let normalString = NSMutableAttributedString(string: reason ?? "")
            attributedString.append(normalString)
            reportReasonLabel.attributedText = attributedString
        }
    }

    private func updateRatingUI() {
        ratingButtons.forEach { $0.isSelected = $0.tag <= rating }
    }
    
    @objc func reasonLabelTapped(sender:UITapGestureRecognizer) {
        delegate?.didSelectReason()
    }
    
    func showMaxCustomValueAlert() {
        let alert = UIAlertController(title: "tip_invalid".localize(), message: "tip_invalid_value".localize(), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "general_ok".localize(), style: .default))
        UIApplication.shared.activeWindow?.rootViewController?.present(alert, animated: true, completion: nil)
    }
    
    func resetTipControl() {
        self.driverTipControl.selectedSegmentIndex = 0
        self.driverTip = driverTipOptions[0]
    }
    
    @IBAction func driverTipChanged(_ sender: UISegmentedControl) {
        let selectedIndex = sender.selectedSegmentIndex
        if selectedIndex == sender.numberOfSegments - 1 {
            let alert = UIAlertController(title: "pwyw_custom_payment".localize(), message: "pwyw_thank_you".localize(), preferredStyle: .alert)
            alert.addTextField { (textField) in
                textField.placeholder = "pwyw_enter_payment".localize()
                textField.keyboardType = .numberPad
            }
            let confirm = UIAlertAction(title: "general_confirm".localize() , style: .default) { _ in
                let textField = alert.textFields![0]
                guard let inputText = textField.text, let value = Int(inputText) else {
                    self.resetTipControl()
                    return
                }
                let valueInCents = value * 100
                if valueInCents <= self.maxCustomValue && valueInCents > self.driverTipOptions[0] {
                    self.driverTip = valueInCents
                    sender.setTitle(self.driverTip.toPrice(with: "usd"), forSegmentAt: selectedIndex)
                } else {
                    self.resetTipControl()
                    self.showMaxCustomValueAlert()
                }
            }
            alert.addAction(confirm)
            UIApplication.shared.activeWindow?.rootViewController?.present(alert, animated: true, completion: nil)
        } else {
            driverTip = driverTipOptions[selectedIndex]
        }
    }

}
