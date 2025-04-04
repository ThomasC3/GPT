//
//  PaymentPickerView.swift
//  FreeRide
//

import UIKit

protocol PaymentPickerViewDelegate: AnyObject {
    func updatePayment(withPayment payment: Int)
    func showPwywInfo()
}

class PaymentPickerView: UIView {
    
    @IBOutlet private weak var paymentTitleLabel: Label!
    @IBOutlet weak var paymentControl: UISegmentedControl!
    @IBOutlet weak var moreInfoView: UIStackView!
    @IBOutlet weak var moreInfoButton: Button?
    @IBOutlet weak var paymentPicketTitleSectionLabel: Label!

    weak var delegate: PaymentPickerViewDelegate?
    
    var paymentOptions: [Int] = []
    var maxCustomValue = 0
    var currency : String = ""
    var paymentValue = -1
    var pwywBaseValue = -1
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(150)
        
        paymentTitleLabel?.style = .subtitle3darkgray
        paymentTitleLabel?.text = "pwyw_payment".localize()
        
        moreInfoButton?.style = .tertiaryDark
        moreInfoButton?.setTitle("pwyw_more_info".localize(), for: .normal)
        
        paymentPicketTitleSectionLabel.style = .subtitle6blue
        paymentPicketTitleSectionLabel.textColor = Theme.Colors.seaFoam
        paymentPicketTitleSectionLabel.text = "pwyw_contribution".localize()
        
        paymentControl.setTitleTextAttributes([NSAttributedString.Key.foregroundColor: UIColor.white], for: .selected)
        UILabel.appearance(whenContainedInInstancesOf: [UISegmentedControl.self]).numberOfLines = 0
    }
    
    @IBAction func paymentValueChanged(_ sender: UISegmentedControl) {
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
                    self.resetPwywControl()
                    return
                }
                let valueInCents = value * 100
                if valueInCents <= self.maxCustomValue && valueInCents > self.paymentOptions[0] {
                    self.paymentValue = valueInCents
                    sender.setTitle(self.paymentValue.toPrice(with: self.currency), forSegmentAt: selectedIndex)
                    self.delegate?.updatePayment(withPayment: self.paymentValue)
                } else {
                    self.resetPwywControl()
                    self.showMaxCustomValueAlert()
                }
            }
            alert.addAction(confirm)
            parentViewController?.present(alert, animated: true)
        } else {
            paymentValue = paymentOptions[selectedIndex]
            delegate?.updatePayment(withPayment: paymentValue)
        }
    }
    
    func update(with paymentInfo: LocationPaymentInfo?) {
        
        guard let locCurrency = paymentInfo?.currency, let locMaxCustomValue = paymentInfo?.maxCustomValue, let locPwywOptions = paymentInfo?.pwywOptions else {
            return
        }
        
        currency = locCurrency
        maxCustomValue = Int(locMaxCustomValue)
        paymentOptions = locPwywOptions
        //paymentOptions = locPwywOptions.map{ Int(truncating: $0) }
        pwywBaseValue = paymentOptions.first ?? -1
        for (index, option) in paymentOptions.enumerated() {
            paymentControl.setTitle(option == 0 ? "pwyw_next_time".localize() : option.toPrice(with: currency), forSegmentAt: index)
        }

        paymentControl.setTitle("pwyw_more".localize(), forSegmentAt: paymentControl.numberOfSegments - 1)
        
        if let pwywCopy = paymentInfo?.pwywCopy {
            paymentTitleLabel?.text = pwywCopy
        }
    }
    
    func updateBaseValue(value: Int) {
        guard !paymentOptions.isEmpty else {
            return
        }
        pwywBaseValue = value
        paymentControl.setTitle(value == 0 ? "pwyw_next_time".localize() :  value.toPrice(with: currency), forSegmentAt: 0)
    }
    
    func resetPwywControl() {
        guard !paymentOptions.isEmpty else {
            return
        }
        self.paymentControl.selectedSegmentIndex = 0
        self.paymentValue = paymentOptions[0]
    }
    
    func baseIsSelected() -> Bool {
        return self.paymentControl.selectedSegmentIndex == 0
    }

    func showMaxCustomValueAlert() {
        let alert = UIAlertController(title: "general_invalid_input".localize(), message: "pwyw_invalid_value".localize(), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "general_ok".localize(), style: .default))
        parentViewController?.present(alert, animated: true)
    }

    @IBAction private func moreInfoAction() {
        delegate?.showPwywInfo()
    }

}
