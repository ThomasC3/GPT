//
//  AccessibilityOptionsView.swift
//  FreeRide
//

import UIKit

protocol AccessibilityOptionsViewDelegate: AnyObject {
    func accessibilityOptionUpdated(withWAV: Bool)
}

class AccessibilityOptionsView: UIView {
    
    @IBOutlet weak var bottomMargin: NSLayoutConstraint!
    @IBOutlet weak var separatorLine: UIView!
    @IBOutlet weak var titleLabel: Label!
    @IBOutlet weak var enableWAVButton: ImageButton!
    @IBOutlet weak var disableWAVButton: ImageButton!
    @IBOutlet weak var accessibilityTitleSectionLabel: Label!
    
    weak var delegate: AccessibilityOptionsViewDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(150)
        
        titleLabel.style = .subtitle3darkgray
        titleLabel.text = "accessibility_toggle_title_request".localize()
        
        accessibilityTitleSectionLabel.style = .subtitle6blue
        accessibilityTitleSectionLabel.textColor = Theme.Colors.seaFoam
        accessibilityTitleSectionLabel.text = "accessibility".localize()
        
        setAccessibilityState()

        enableWAVButton.titleLabel.text = "Yes"
        enableWAVButton.titleLabel.style = .subtitle1bluegray
        enableWAVButton.titleLabel.textColor = Theme.Colors.blueGray

        disableWAVButton.titleLabel.text = "No"
        disableWAVButton.titleLabel.style = .subtitle1bluegray
        disableWAVButton.titleLabel.textColor = Theme.Colors.blueGray

        let wheelchairOn = Defaults.requestingWheelchairAccess
        enableWAVButton.backgroundColor = wheelchairOn ? Theme.Colors.seaFoam : Theme.Colors.coolGray
        disableWAVButton.backgroundColor = !wheelchairOn ? Theme.Colors.seaFoam : Theme.Colors.coolGray

        enableWAVButton.imageView.image = #imageLiteral(resourceName: "round_accessible_black_24pt")
        enableWAVButton.imageView.tintColor = wheelchairOn ? .white : Theme.Colors.blueGray
        enableWAVButton.titleLabel.textColor = wheelchairOn ? .white : Theme.Colors.blueGray
        enableWAVButton.isUserInteractionEnabled = true
        enableWAVButton.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(self.enableWheelchairAction(_:))))

        disableWAVButton.imageView.image = #imageLiteral(resourceName: "round_not_accessible_black_24pt")
        disableWAVButton.imageView.tintColor = !wheelchairOn ? .white : Theme.Colors.blueGray
        disableWAVButton.titleLabel.textColor = !wheelchairOn ? .white : Theme.Colors.blueGray
        disableWAVButton.isUserInteractionEnabled = true
        disableWAVButton.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(self.disableWheelchairAction(_:))))
        
        //TODO: add the button here to disable the accessibility view from the request screen
    }
    
    func update() {
        setAccessibilityState()
    }
    
    func setTitle(title: String) {
        titleLabel.text = title
    }
    
    func setForAccessibilitySection() {
        separatorLine.isHidden = true
        titleLabel.text = ""
        accessibilityTitleSectionLabel.text = ""
        bottomMargin.constant = 20
    }
    
    func setAccessibilityState() {
        let wheelchairOn = Defaults.requestingWheelchairAccess

        enableWAVButton.backgroundColor = wheelchairOn ? Theme.Colors.seaFoam : Theme.Colors.coolGray
        disableWAVButton.backgroundColor = !wheelchairOn ? Theme.Colors.seaFoam : Theme.Colors.coolGray

        enableWAVButton.imageView.tintColor = wheelchairOn ? .white : Theme.Colors.blueGray
        enableWAVButton.titleLabel.textColor = wheelchairOn ? .white : Theme.Colors.blueGray

        disableWAVButton.imageView.tintColor = !wheelchairOn ? .white : Theme.Colors.blueGray
        disableWAVButton.titleLabel.textColor = !wheelchairOn ? .white : Theme.Colors.blueGray
    }
    
    @objc func wheelchairAction(_ sender: UITapGestureRecognizer) {
        Defaults.requestingWheelchairAccess = !Defaults.requestingWheelchairAccess
        setAccessibilityState()
    }

    @objc func enableWheelchairAction(_ sender: UITapGestureRecognizer) {
        Defaults.requestingWheelchairAccess = true
        setAccessibilityState()
    }

    @objc func disableWheelchairAction(_ sender: UITapGestureRecognizer) {
        Defaults.requestingWheelchairAccess = false
        setAccessibilityState()
        delegate?.accessibilityOptionUpdated(withWAV: false)
    }

}
