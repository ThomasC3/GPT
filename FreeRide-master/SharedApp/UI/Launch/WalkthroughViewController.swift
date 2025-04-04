//
//  WalkthroughViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/9/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class WalkthroughViewController: ViewController {

    @IBOutlet private weak var loginButton: Button?
    @IBOutlet private weak var registerButton: Button?
    @IBOutlet private weak var containerView: UIView?
    @IBOutlet private weak var pageControl: UIPageControl?

    private var pagingTimer: Timer?
    private var currentPage = 0

    private let pageContent: [ContentViewController.Content] = {
        var content = [ContentViewController.Content]()

        content.append(ContentViewController.Content(image: #imageLiteral(resourceName: "WalkthroughPhoto1"), title: "launch_walkthrough_title_1".localize(), subtitle: "launch_walkthrough_subtitle_1".localize()))
        content.append(ContentViewController.Content(image: #imageLiteral(resourceName: "WalkthroughPhoto2"), title: "launch_walkthrough_title_2".localize(), subtitle: "launch_walkthrough_subtitle_2".localize()))
        content.append(ContentViewController.Content(image: #imageLiteral(resourceName: "WalkthroughPhoto3"), title: "launch_walkthrough_title_3".localize(), subtitle: "launch_walkthrough_subtitle_3".localize()))

        return content
    }()

    private lazy var pagingControllers: [UIViewController] = {
        var controllers = [UIViewController]()

        for (index, content) in pageContent.enumerated() {
            let vc: ContentViewController = .instantiateFromStoryboard()
            vc.configure(index: index, content: content)
            controllers.append(vc)
        }

        return controllers
    }()

    private lazy var pageController: UIPageViewController =  {
        let vc = UIPageViewController(transitionStyle: .scroll,
                                      navigationOrientation: .horizontal,
                                      options: nil)

        if let controller = pagingControllers.first {
            vc.setViewControllers([pagingControllers[0]], direction: .forward, animated: false, completion: nil)
        }

        vc.dataSource = self
        vc.delegate = self

        return vc
    }()

    override public func viewDidLoad() {
        super.viewDidLoad()

        pageControl?.numberOfPages = pagingControllers.count
        containerView?.isUserInteractionEnabled = pagingControllers.count > 1

        addChild(pageController)
        containerView?.addSubview(pageController.view)
        pageController.didMove(toParent: self)
        
        registerButton?.setTitle("Sign Up".localize(), for: .normal)
        registerButton?.accessibilityIdentifier = "signUpButton"

        loginButton?.setTitle("Log In".localize(), for: .normal)
        loginButton?.accessibilityIdentifier = "signInButton"

        Notification.addObserver(self, name: UIApplication.didEnterBackgroundNotification, selector: #selector(stopPagingTimer))
        Notification.addObserver(self, name: UIApplication.didBecomeActiveNotification, selector: #selector(startPagingTimer))
    }

    override public func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        startPagingTimer()
    }

    override public func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        guard let containerView = containerView else {
            return
        }

        pageController.view.frame = containerView.frame
    }

    override func applyTheme() {
        super.applyTheme()

        registerButton?.style = .secondary
        loginButton?.style = .secondary
    }

    @IBAction private func loginAction() {
        transition(to: .login)
    }

    @IBAction private func registerAction() {
        transition(to: .register)
    }
    
    private func transition(to mode: AuthenticationMode) {
        let vc = AuthOptionsViewController(mode: mode)
        navigationController?.pushViewController(vc, animated: true)
    }

    @objc private func startPagingTimer() {
        guard pagingTimer == nil else {
            return
        }

        pagingTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { _ in
            guard let nextController = self.nextController(afterIndex: self.currentPage, isForward: true),
                let nextIndex = self.pagingControllers.firstIndex(of: nextController) else {
                    return
            }

            self.pageController.setViewControllers([nextController], direction: .forward, animated: true)
            self.currentPage = nextIndex
            self.pageControl?.currentPage = self.currentPage
        }
    }

    @objc private func stopPagingTimer() {
        pagingTimer?.invalidate()
        pagingTimer = nil
    }
}

extension WalkthroughViewController: UIPageViewControllerDataSource, UIPageViewControllerDelegate {

    public func pageViewController(_ pageViewController: UIPageViewController, viewControllerBefore viewController: UIViewController) -> UIViewController? {
        return nextController(comingAfter: viewController, isForward: false)
    }

    public func pageViewController(_ pageViewController: UIPageViewController, viewControllerAfter viewController: UIViewController) -> UIViewController? {
        return nextController(comingAfter: viewController, isForward: true)
    }

    public func pageViewController(_ pageViewController: UIPageViewController, willTransitionTo pendingViewControllers: [UIViewController]) {
        stopPagingTimer()

        guard let vc = pendingViewControllers.last as? ContentViewController,
            let index = vc.index else {
                return
        }

        currentPage = index
    }

    public func pageViewController(_ pageViewController: UIPageViewController, didFinishAnimating finished: Bool, previousViewControllers: [UIViewController], transitionCompleted completed: Bool) {
        guard completed && finished else {
            return
        }

        pageControl?.currentPage = currentPage
        startPagingTimer()
    }

    private func nextController(comingAfter viewController: UIViewController, isForward: Bool) -> UIViewController? {
        guard let viewController = viewController as? ContentViewController,
            let index = viewController.index else {
                return nil
        }

        return nextController(afterIndex: index, isForward: isForward)
    }

    private func nextController(afterIndex index: Int, isForward: Bool) -> UIViewController? {
        let afterIndex = (index + 1 >= pagingControllers.count) ? 0 : (index + 1)
        let beforeIndex = (index - 1 < 0) ? (pagingControllers.count - 1) : (index - 1)
        let nextIndex = isForward ? afterIndex : beforeIndex
        guard nextIndex < pagingControllers.count && nextIndex >= 0 else {
            return nil
        }

        return pagingControllers[nextIndex]
    }
}
