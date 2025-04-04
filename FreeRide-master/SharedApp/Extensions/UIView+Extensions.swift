//
//  UIView+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/4/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension UIView {

    var cornerRadius: CGFloat {
        get { return layer.cornerRadius }
        set { layer.cornerRadius = newValue }
    }

    var borderWidth: CGFloat {
        get { return layer.borderWidth }
        set { layer.borderWidth = newValue }
    }

    var borderColor: CGColor? {
        get { return layer.borderColor }
        set { layer.borderColor = newValue }
    }

    var shadowColor: CGColor? {
        get { return layer.shadowColor }
        set { layer.shadowColor = newValue }
    }

    var shadowRadius: CGFloat {
        get { return layer.shadowRadius }
        set { layer.shadowRadius = newValue }
    }

    var shadowOffset: CGSize {
        get { return layer.shadowOffset }
        set { layer.shadowOffset = newValue }
    }

    var shadowOpacity: Float {
        get { return layer.shadowOpacity }
        set { layer.shadowOpacity = newValue }
    }
    
    func addCustomShadow(color: UIColor = UIColor.black.withAlphaComponent(0.2), radius: CGFloat = 10, x: CGFloat = 0, y: CGFloat = -3) {
            self.layer.shadowColor = color.cgColor
            self.layer.shadowOpacity = 1.0
            self.layer.shadowOffset = CGSize(width: x, height: y)
            self.layer.shadowRadius = radius
            self.layer.masksToBounds = false
        }

    static func instantiateFromNib<T: UIView>() -> T {
        let bundle = Bundle.main
        let identifier = String(describing: T.self)
        let nib = UINib(nibName: identifier, bundle: bundle)
        return nib.instantiate(withOwner: nil, options: nil).first as! T
    }

    convenience init(backgroundColor: UIColor) {
        self.init()
        self.backgroundColor = backgroundColor
    }

    func addTapRecognizer(target: Any?, selector: Selector?) {
        let tapRecognizer = UITapGestureRecognizer(target: target, action: selector)
        tapRecognizer.numberOfTapsRequired = 1
        addGestureRecognizer(tapRecognizer)
    }

    func removeAllGestures() {
        gestureRecognizers?.forEach({ gesture in
            removeGestureRecognizer(gesture)
        })
    }

    func addShadow(color: UIColor = Theme.Colors.darkGray.withAlphaComponent(0.1), offset: CGSize = CGSize(width: 0, height: 3), opacity: Float = 0.6, radius: CGFloat = 3) {
        shadowColor = color.cgColor
        shadowOffset = offset
        shadowOpacity = opacity
        shadowRadius = radius
    }
    
    var parentViewController: UIViewController? {
        sequence(first: self) { $0.next }
            .first(where: { $0 is UIViewController })
            .flatMap { $0 as? UIViewController }
    }
}
